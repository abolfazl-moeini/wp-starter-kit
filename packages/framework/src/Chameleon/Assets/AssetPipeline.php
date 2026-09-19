<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Assets;

use WPDev\Chameleon\Theme\TokenHarvester;

/**
 * AssetPipeline: Enforces zero-waste single-archetype asset delivery, layer order registration,
 * and component-gated JavaScript enqueueing (SPEC §6.2 & Plan §2.5).
 */
final class AssetPipeline {
    const ENGINE_VERSION = '2.0.0';
    const ENGINE_FINGERPRINT = '/* ps-engine:2.0.0 */';

    /**
     * @var string|null Cached active archetype for current request
     */
    private static ?string $active_archetype = null;

    /**
     * @var string Path to polaris dist directory
     */
    private static string $dist_path = '';

    /**
     * @var string URL to polaris dist directory
     */
    private static string $dist_url = '';

    /**
     * Initialize asset hooks.
     *
     * @param string $dist_path Absolute path to @wpdev/polaris-stack/dist
     * @param string $dist_url Public URL to @wpdev/polaris-stack/dist
     */
    public static function init(string $dist_path, string $dist_url): void {
        self::$dist_path = rtrim($dist_path, '/');
        self::$dist_url  = rtrim($dist_url, '/');

        // Register layer order statement at earliest priority in wp_head
        if (function_exists('add_action')) {
            add_action('wp_head', [self::class, 'print_layer_order_header'], 1);
            add_action('wp_enqueue_scripts', [self::class, 'enqueue_assets'], 10);
            add_action('after_switch_theme', [TokenHarvester::class, 'invalidate']);
        }
    }

    /**
     * Get the active archetype for the current request (evaluated once).
     */
    public static function get_active_archetype(): string {
        if (self::$active_archetype === null) {
            $archetype = 'material';
            if (function_exists('apply_filters')) {
                $archetype = (string) apply_filters('wpdev_chameleon_archetype', $archetype);
            }
            $valid_archetypes = ['flat', 'material', 'glass', 'brutalist', 'cupertino'];
            if (!in_array($archetype, $valid_archetypes, true)) {
                $archetype = 'material';
            }
            self::$active_archetype = $archetype;
        }

        return self::$active_archetype;
    }

    /**
     * Print the 6-layer CSS declaration at document head (Priority 1).
     */
    public static function print_layer_order_header(): void {
        $nonce_attr = self::get_nonce_attribute();
        echo sprintf(
            "<style id='ps-layer-order'%s>\n%s\n@layer ps.harden, ps.base, ps.archetype, ps.host, ps.tenant, ps.skin;\n</style>\n",
            $nonce_attr,
            self::ENGINE_FINGERPRINT
        );

        // In Mode A (Default Critical Inlined SSR), also inline polaris-core.css and active archetype
        $use_inline = true;
        if (function_exists('apply_filters')) {
            $use_inline = (bool) apply_filters('wpdev_chameleon_inline_styles', true);
        }

        if ($use_inline) {
            self::print_inlined_styles($nonce_attr);
        }
    }

    /**
     * Enqueue stylesheets in Mode B (Discrete Handles) or scripts.
     */
    public static function enqueue_assets(): void {
        $use_inline = true;
        if (function_exists('apply_filters')) {
            $use_inline = (bool) apply_filters('wpdev_chameleon_inline_styles', true);
        }

        // Mode B: Enqueue discrete handles
        if (!$use_inline && function_exists('wp_enqueue_style') && !empty(self::$dist_url)) {
            wp_enqueue_style('wpdev-polaris-core', self::$dist_url . '/polaris-core.css', [], self::ENGINE_VERSION);

            $active = self::get_active_archetype();
            wp_enqueue_style(
                "wpdev-polaris-archetype-{$active}",
                self::$dist_url . "/archetypes/{$active}.css",
                ['wpdev-polaris-core'],
                self::ENGINE_VERSION
            );
        }

        // Gated JS: Dialog enhancer
        if (function_exists('wp_enqueue_script') && !empty(self::$dist_url)) {
            wp_enqueue_script(
                'wpdev-chameleon-dialog-enhancer',
                self::$dist_url . '/islands/dialog-enhancer.js',
                [],
                self::ENGINE_VERSION,
                true
            );
        }
    }

    /**
     * Enqueue tabs controller when tabs are present.
     */
    public static function enqueue_tabs_controller(): void {
        if (function_exists('wp_enqueue_script') && !empty(self::$dist_url)) {
            wp_enqueue_script(
                'wpdev-chameleon-tabs',
                self::$dist_url . '/islands/tabs.js',
                [],
                self::ENGINE_VERSION,
                true
            );
        }
    }

    /**
     * Print inlined core and active archetype CSS in Mode A.
     */
    private static function print_inlined_styles(string $nonce_attr): void {
        if (empty(self::$dist_path)) {
            return;
        }

        // 1. Inline polaris-core.css
        $core_file = self::$dist_path . '/polaris-core.css';
        if (file_exists($core_file)) {
            $core_css = file_get_contents($core_file);
            if ($core_css !== false) {
                echo sprintf("<style id='ps-core'%s>\n%s\n</style>\n", $nonce_attr, $core_css);
            }
        }

        // 2. Inline SINGLE active archetype CSS (Zero-Waste Invariant)
        $active = self::get_active_archetype();
        $archetype_file = self::$dist_path . "/archetypes/{$active}.css";
        if (file_exists($archetype_file)) {
            $archetype_css = file_get_contents($archetype_file);
            if ($archetype_css !== false) {
                echo sprintf("<style id='ps-archetype'%s>\n%s\n</style>\n", $nonce_attr, $archetype_css);
            }
        }

        // 3. Inline cached host tokens CSS
        $host_tokens = TokenHarvester::get_host_tokens_css();
        if (!empty($host_tokens)) {
            echo sprintf("<style id='ps-host-tokens'%s>\n%s\n</style>\n", $nonce_attr, $host_tokens);
        }
    }

    /**
     * Get CSP nonce attribute if supported by host environment.
     */
    private static function get_nonce_attribute(): string {
        if (function_exists('wp_get_inline_script_tag')) {
            // WordPress 5.7+ inline tag attributes support
            $tag = wp_get_inline_script_tag('');
            if (preg_match('/nonce=[\'"][^\'"]+[\'"]/', $tag, $matches)) {
                return ' ' . $matches[0];
            }
        }
        return '';
    }
}
