<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme;

use WPDev\Chameleon\Assets\AssetPipeline;
use WPDev\Chameleon\Theme\HostTokens\Sanitizer;
use WPDev\Chameleon\Theme\HostTokens\Chain;

/**
 * TokenHarvester: Extracts host theme design tokens from WordPress Core theme.json
 * into @layer ps.host, caching the output in a transient with strict allow-list sanitization (SPEC §5 & Plan CP-4).
 */
final class TokenHarvester {
    const TRANSIENT_PREFIX = 'chameleon_host_tokens_';

    /**
     * @var bool Whether invalidation hooks have been registered
     */
    private static bool $hooks_registered = false;

    /**
     * Register cache invalidation hooks.
     */
    public static function init_hooks(): void {
        if (self::$hooks_registered || !function_exists('add_action')) {
            return;
        }
        self::$hooks_registered = true;

        add_action('save_post_wp_global_styles', [self::class, 'invalidate']);
        add_action('delete_post', [self::class, 'invalidate']);
        add_action('trashed_post', [self::class, 'invalidate']);
        add_action('after_switch_theme', [self::class, 'invalidate']);
        add_action('customize_save_after', [self::class, 'invalidate']);
        add_action('upgrader_process_complete', [self::class, 'invalidate']);
    }

    /**
     * Get or generate the cached host tokens CSS string.
     *
     * @return string Layered CSS declarations for @layer ps.host
     */
    public static function get_host_tokens_css(): string {
        self::init_hooks();

        $cache_key = self::get_cache_key();

        if (function_exists('get_transient')) {
            $cached = get_transient($cache_key);
            if (is_string($cached) && !empty($cached)) {
                return $cached;
            }
        }

        $css = self::generate_css();

        if (function_exists('set_transient')) {
            // Cache for 24 hours, or until invalidated by theme update / Global Styles save
            set_transient($cache_key, $css, DAY_IN_SECONDS);
        }

        return $css;
    }

    /**
     * Invalidate cached tokens on theme switch, update, or Global Styles change.
     */
    public static function invalidate(): void {
        if (function_exists('update_option')) {
            $gen = (int) (function_exists('get_option') ? get_option('wpdev_ps_token_generation', 1) : 1);
            update_option('wpdev_ps_token_generation', $gen + 1);
        }
        if (function_exists('delete_transient')) {
            delete_transient(self::get_cache_key());
        }
    }

    /**
     * Generate unique cache key based on stylesheet, theme version, user global styles post, engine version, and generation (R9 / Plan 2).
     */
    private static function get_cache_key(): string {
        $stylesheet = function_exists('get_stylesheet') ? (string) get_stylesheet() : 'default';
        $user_id = '0';

        // Fix R9: Use WP_Theme_JSON_Resolver::get_user_global_styles_post_id()
        if (class_exists(\WP_Theme_JSON_Resolver::class)) {
            $user_id = (string) \WP_Theme_JSON_Resolver::get_user_global_styles_post_id();
        }

        $theme_version = '1.0.0';
        if (function_exists('wp_get_theme')) {
            $theme = wp_get_theme($stylesheet);
            if ($theme->exists()) {
                $theme_version = (string) $theme->get('Version');
            }
        }

        $generation = function_exists('get_option') ? (string) get_option('wpdev_ps_token_generation', '1') : '1';

        return self::TRANSIENT_PREFIX . md5($stylesheet . '_' . $theme_version . '_' . $user_id . '_' . AssetPipeline::ENGINE_VERSION . '_' . $generation);
    }

    /**
     * Extract and sanitize tokens into @layer ps.host CSS.
     */
    private static function generate_css(): string {
        $chain = new Chain();
        try {
            $chainCss = $chain->generate_css();
        } catch ( \InvalidArgumentException $e ) {
            $chainCss = '';
        }
        if (!empty($chainCss)) {
            return $chainCss;
        }

        $css_declarations = [];

        if (function_exists('wp_get_global_settings')) {
            $settings = wp_get_global_settings();

            // 1. Semantic Color Mapping (R10)
            // Search order: theme and custom palettes only (default core palette is ignored)
            $palette = array_merge(
                $settings['color']['palette']['theme'] ?? [],
                $settings['color']['palette']['custom'] ?? []
            );

            $palette_by_slug = [];
            foreach ($palette as $item) {
                if (isset($item['slug'], $item['color'])) {
                    $slug = sanitize_key((string) $item['slug']);
                    $clean_color = self::sanitize_css_color((string) $item['color']);
                    if ($clean_color !== null) {
                        $palette_by_slug[$slug] = $clean_color;
                        $css_declarations["--ps-host-color-{$slug}"] = "--ps-host-color-{$slug}: {$clean_color};";
                    }
                }
            }

            // Semantic role resolution (R10)
            $semantic_map = [
                '--ps-color-primary' => ['primary', 'accent-1', 'accent'],
                '--ps-color-bg'      => ['base', 'background'],
                '--ps-color-fg'      => ['contrast', 'foreground'],
            ];

            if (function_exists('apply_filters')) {
                $semantic_map = (array) apply_filters('wpdev_chameleon_host_token_map', $semantic_map);
            }

            foreach ($semantic_map as $ps_token => $candidate_slugs) {
                foreach ((array) $candidate_slugs as $cand) {
                    if (isset($palette_by_slug[$cand])) {
                        $css_declarations[$ps_token] = "{$ps_token}: {$palette_by_slug[$cand]};";
                        break;
                    }
                }
            }

            // 2. Typography Mapping
            $font_families = array_merge(
                $settings['typography']['fontFamilies']['theme'] ?? [],
                $settings['typography']['fontFamilies']['custom'] ?? []
            );

            $fonts_by_slug = [];
            foreach ($font_families as $font) {
                if (isset($font['slug'], $font['fontFamily'])) {
                    $slug = sanitize_key((string) $font['slug']);
                    $clean_family = self::sanitize_font_family((string) $font['fontFamily']);
                    if ($clean_family !== null) {
                        $fonts_by_slug[$slug] = $clean_family;
                        $css_declarations["--ps-host-font-{$slug}"] = "--ps-host-font-{$slug}: {$clean_family};";
                    }
                }
            }

            if (isset($fonts_by_slug['body'])) {
                $css_declarations['--ps-font-body'] = "--ps-font-body: {$fonts_by_slug['body']};";
            } elseif (isset($fonts_by_slug['primary'])) {
                $css_declarations['--ps-font-body'] = "--ps-font-body: {$fonts_by_slug['primary']};";
            }

            if (isset($fonts_by_slug['heading'])) {
                $css_declarations['--ps-font-heading'] = "--ps-font-heading: {$fonts_by_slug['heading']};";
            } elseif (isset($fonts_by_slug['secondary'])) {
                $css_declarations['--ps-font-heading'] = "--ps-font-heading: {$fonts_by_slug['secondary']};";
            }
        }

        // 3. Button Border Radius from Global Styles (R11)
        if (function_exists('wp_get_global_styles')) {
            $radius = wp_get_global_styles(['elements', 'button', 'border', 'radius']);
            if (is_string($radius) && !empty($radius)) {
                $clean_radius = self::sanitize_css_length($radius);
                if ($clean_radius !== null) {
                    $css_declarations['--ps-radius-1'] = "--ps-radius-1: {$clean_radius};";
                    $css_declarations['--ps-radius-sm'] = "--ps-radius-sm: {$clean_radius};";
                }
            }
        }

        // 4. Classic Theme Seam: Filter hook for manual host tokens (Plan CP-4 §5)
        if (function_exists('apply_filters')) {
            $manual_tokens = apply_filters('wpdev_chameleon_host_tokens', []);
            if (is_array($manual_tokens)) {
                foreach ($manual_tokens as $token_name => $token_val) {
                    // The name is written verbatim into CSS, so it must be a plain custom-property ident
                    // (a name like "--ps-x;}body{display:none" would otherwise inject rules).
                    if (!is_string($token_name) || !preg_match('/^--ps-[a-z0-9-]+$/', $token_name)) {
                        continue;
                    }
                    $clean = null;
                    if (strpos($token_name, 'color') !== false) {
                        $clean = self::sanitize_css_color((string) $token_val);
                    } elseif (strpos($token_name, 'radius') !== false || strpos($token_name, 'space') !== false) {
                        $clean = self::sanitize_css_length((string) $token_val);
                    } elseif (strpos($token_name, 'font') !== false) {
                        $clean = self::sanitize_font_family((string) $token_val);
                    } else {
                        $clean = self::sanitize_css_length((string) $token_val);
                    }

                    if ($clean !== null) {
                        $css_declarations[$token_name] = "{$token_name}: {$clean};";
                    }
                }
            }
        }

        if (empty($css_declarations)) {
            return '';
        }

        return "@layer ps.host {\n  .ps-root {\n    " . implode("\n    ", array_values($css_declarations)) . "\n  }\n}\n";
    }

    /**
     * Strict allow-list sanitizer for CSS color values (delegated to Sanitizer).
     */
    public static function sanitize_css_color(string $val): ?string {
        return Sanitizer::sanitize_color($val);
    }

    /**
     * Strict allow-list sanitizer for CSS length / dimension values (delegated to Sanitizer).
     */
    public static function sanitize_css_length(string $val): ?string {
        return Sanitizer::sanitize_length($val);
    }

    /**
     * Strict allow-list sanitizer for CSS font families (delegated to Sanitizer).
     */
    public static function sanitize_font_family(string $val): ?string {
        return Sanitizer::sanitize_font_family($val);
    }
}
