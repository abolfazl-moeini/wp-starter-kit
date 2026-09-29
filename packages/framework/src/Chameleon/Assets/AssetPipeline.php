<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Assets;

use WPDev\Chameleon\Theme\TokenHarvester;

/**
 * AssetPipeline: Enforces zero-waste single-archetype asset delivery, layer order registration,
 * idempotent multi-plugin lifecycle, and demand-gated JavaScript/CSS enqueueing (SPEC §6.2 & Plan CP-2).
 *
 * All mutable state lives in one request-global registry ($GLOBALS[self::REGISTRY]) instead of class
 * statics. Plugins may bundle prefixed copies of this class (Strauss/Rector prefixing), and only the
 * first copy registers WordPress hooks; keeping needs/behaviors in the shared registry guarantees that
 * demand declared through any copy is honoured by the hook handler (the highest engine version).
 */
final class AssetPipeline {
    const ENGINE_VERSION = '2.0.0';
    const ENGINE_FINGERPRINT = '/* ps-engine:2.0.0 */';
    const REGISTRY = 'wpdev_chameleon_engine';

    /**
     * Gated island scripts, keyed by behavior name (relative to the dist directory).
     */
    const BEHAVIOR_SCRIPTS = [
        'dialog' => ['handle' => 'wpdev-chameleon-dialog-enhancer', 'file' => 'islands/dialog-enhancer.js'],
        'tabs'   => ['handle' => 'wpdev-chameleon-tabs', 'file' => 'islands/tabs.js'],
    ];

    /**
     * @var string|null Cached active archetype for current request
     */
    private static ?string $active_archetype = null;

    /**
     * Initialize asset hooks with multi-plugin idempotent version negotiation (R6).
     *
     * @param string $dist_path Absolute path to @wpdev/polaris-stack/dist
     * @param string $dist_url Public URL to @wpdev/polaris-stack/dist
     */
    public static function init(string $dist_path, string $dist_url): void {
        $registry = &self::registry();

        $is_first = $registry['handler'] === null;
        if ($is_first || version_compare(self::ENGINE_VERSION, (string) $registry['version'], '>')) {
            $registry['version']   = self::ENGINE_VERSION;
            $registry['handler']   = self::class;
            $registry['dist_path'] = rtrim($dist_path, '/');
            $registry['dist_url']  = rtrim($dist_url, '/');
        }

        // Invalidation hooks must exist on every request (including REST saves from the Site Editor),
        // not only on front-end requests that happen to read the token cache.
        TokenHarvester::init_hooks();

        // Register action hooks exactly once globally; they dispatch to the current handler at call time,
        // so a later-loaded higher engine version takes over without re-registering.
        if (function_exists('add_action') && empty($registry['hooks_registered'])) {
            $registry['hooks_registered'] = true;
            add_action('wp_head', static function (): void {
                self::handler()::print_layer_order_header();
            }, 1);
            add_action('wp_enqueue_scripts', static function (): void {
                self::handler()::enqueue_assets();
            }, 10);
        }
    }

    /**
     * Register a callback to determine whether Chameleon assets are needed on current screen/request (R5).
     * Evaluated on wp_enqueue_scripts / wp_head, i.e. before any template output.
     *
     * @param callable(): bool $callback
     */
    public static function register_need(callable $callback): void {
        $registry = &self::registry();
        $registry['needs'][] = $callback;
        $registry['needed']  = null;
    }

    /**
     * Evaluate whether Chameleon assets are needed for the current request.
     * With no registered need callbacks nothing is loaded (zero-waste); rendering can still demand
     * assets late via mark_needed().
     */
    public static function is_needed(): bool {
        $registry = &self::registry();

        if (!empty($registry['forced'])) {
            return true;
        }
        if ($registry['needed'] !== null) {
            return (bool) $registry['needed'];
        }

        $registry['needed'] = false;
        foreach ($registry['needs'] as $cb) {
            try {
                if ((bool) call_user_func($cb)) {
                    $registry['needed'] = true;
                    break;
                }
            } catch (\Throwable $e) {
                // Fail-soft: continue evaluating remaining callbacks
            }
        }

        return (bool) $registry['needed'];
    }

    /**
     * Fallback to declare need during rendering (e.g. from Renderer::render_root).
     */
    public static function mark_needed(): void {
        $registry = &self::registry();
        $registry['forced'] = true;

        if (!function_exists('did_action')) {
            return;
        }

        if (!did_action('wp_head')) {
            // Block themes render the template before wp_head: normal head delivery still happens.
            self::handler()::enqueue_assets();
            return;
        }

        if (did_action('wp_footer')) {
            return;
        }

        // Classic themes: <head> is already out. Mode B handles are printed by WordPress as late styles;
        // Mode A inline styles need an explicit footer print (otherwise no CSS reaches the page at all).
        self::handler()::enqueue_assets();
        if (empty($registry['styles_printed']) && empty($registry['late_hooked']) && function_exists('add_action')) {
            $registry['late_hooked'] = true;
            add_action('wp_footer', static function (): void {
                self::handler()::print_layer_order_header();
            }, 1);
        }

        if (empty($registry['late_notice']) && defined('WP_DEBUG') && WP_DEBUG && function_exists('_doing_it_wrong')) {
            $registry['late_notice'] = true;
            _doing_it_wrong(
                __METHOD__,
                'Chameleon assets were demanded after wp_head. Pre-register demand via AssetPipeline::register_need() to prevent FOUC.',
                self::ENGINE_VERSION
            );
        }
    }

    /**
     * Require a specific island behavior (e.g. 'dialog', 'tabs') to trigger gated script enqueues (R5).
     */
    public static function require_behavior(string $behavior): void {
        if (!isset(self::BEHAVIOR_SCRIPTS[$behavior])) {
            return;
        }

        $registry = &self::registry();
        $registry['behaviors'][$behavior] = true;

        self::enqueue_behavior($behavior);
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
     * Print the 6-layer CSS declaration (wp_head priority 1, or wp_footer as late fallback).
     * Deduplicated across multiple plugins (R6).
     */
    public static function print_layer_order_header(): void {
        if (!self::is_needed()) {
            return;
        }

        $registry = &self::registry();
        if (!empty($registry['styles_printed'])) {
            return;
        }
        $registry['styles_printed'] = true;

        $nonce_attr = self::get_nonce_attribute();
        echo sprintf(
            "<style id='ps-layer-order'%s>\n%s\n@layer ps.harden, ps.base, ps.archetype, ps.host, ps.tenant, ps.skin;\n</style>\n",
            $nonce_attr,
            self::ENGINE_FINGERPRINT
        );

        if (self::use_inline_styles()) {
            self::print_inlined_styles($nonce_attr);
        }
    }

    /**
     * Enqueue stylesheets in Mode B (Discrete Handles) and any required behavior scripts.
     */
    public static function enqueue_assets(): void {
        if (!self::is_needed()) {
            return;
        }

        $registry = &self::registry();
        $dist_url = (string) $registry['dist_url'];

        // Mode B: Enqueue discrete handles + attach host tokens to core handle (R7)
        if (!self::use_inline_styles() && function_exists('wp_enqueue_style')) {
            if ($dist_url === '') {
                if (defined('WP_DEBUG') && WP_DEBUG && function_exists('_doing_it_wrong')) {
                    _doing_it_wrong(
                        __METHOD__,
                        'Chameleon dist_url is empty. AssetPipeline::init() must be called with a valid dist URL.',
                        self::ENGINE_VERSION
                    );
                }
                return;
            }
            wp_enqueue_style('wpdev-polaris-core', $dist_url . '/polaris-core.css', [], self::ENGINE_VERSION);

            if (empty($registry['host_tokens_attached'])) {
                $registry['host_tokens_attached'] = true;
                $host_tokens = TokenHarvester::get_host_tokens_css();
                if ($host_tokens !== '' && function_exists('wp_add_inline_style')) {
                    wp_add_inline_style('wpdev-polaris-core', $host_tokens);
                }
            }

            $active = self::get_active_archetype();
            wp_enqueue_style(
                "wpdev-polaris-archetype-{$active}",
                $dist_url . "/archetypes/{$active}.css",
                ['wpdev-polaris-core'],
                self::ENGINE_VERSION
            );
        }

        foreach (array_keys($registry['behaviors']) as $behavior) {
            self::enqueue_behavior((string) $behavior);
        }
    }

    /**
     * Enqueue tabs controller when tabs are present.
     */
    public static function enqueue_tabs_controller(): void {
        self::require_behavior('tabs');
    }

    /**
     * Reset shared state for test isolation.
     */
    public static function reset(): void {
        self::$active_archetype = null;
        unset($GLOBALS[self::REGISTRY]);
    }

    /**
     * Shared request-global registry (see class docblock).
     *
     * @return array<string, mixed>
     */
    private static function &registry(): array {
        if (!isset($GLOBALS[self::REGISTRY]) || !is_array($GLOBALS[self::REGISTRY])) {
            $GLOBALS[self::REGISTRY] = [];
        }
        $GLOBALS[self::REGISTRY] += [
            'version'          => '0.0.0',
            'handler'          => null,
            'dist_path'        => '',
            'dist_url'         => '',
            'hooks_registered' => false,
            'needs'            => [],
            'needed'           => null,
            'forced'           => false,
            'behaviors'        => [],
            'styles_printed'   => false,
            'late_hooked'      => false,
        ];

        return $GLOBALS[self::REGISTRY];
    }

    /**
     * The class (possibly a prefixed copy) that owns the highest engine version.
     *
     * @return class-string
     */
    private static function handler(): string {
        $handler = self::registry()['handler'];

        return (is_string($handler) && class_exists($handler)) ? $handler : self::class;
    }

    private static function use_inline_styles(): bool {
        return function_exists('apply_filters')
            ? (bool) apply_filters('wpdev_chameleon_inline_styles', true)
            : true;
    }

    private static function enqueue_behavior(string $behavior): void {
        $dist_url = (string) self::registry()['dist_url'];
        if (!isset(self::BEHAVIOR_SCRIPTS[$behavior]) || $dist_url === '' || !function_exists('wp_enqueue_script')) {
            return;
        }

        $script = self::BEHAVIOR_SCRIPTS[$behavior];
        wp_enqueue_script($script['handle'], $dist_url . '/' . $script['file'], [], self::ENGINE_VERSION, true);
    }

    /**
     * Print inlined core and active archetype CSS in Mode A.
     */
    private static function print_inlined_styles(string $nonce_attr): void {
        $dist_path = (string) self::registry()['dist_path'];
        if ($dist_path === '') {
            if (defined('WP_DEBUG') && WP_DEBUG && function_exists('_doing_it_wrong')) {
                _doing_it_wrong(
                    __METHOD__,
                    'Chameleon dist_path is empty. AssetPipeline::init() must be called with a valid dist directory.',
                    self::ENGINE_VERSION
                );
            }
            return;
        }

        // 1. Inline polaris-core.css
        $core_file = $dist_path . '/polaris-core.css';
        if (file_exists($core_file)) {
            $core_css = file_get_contents($core_file);
            if ($core_css !== false) {
                echo sprintf("<style id='ps-core'%s>\n%s\n</style>\n", $nonce_attr, $core_css);
            }
        }

        // 2. Inline SINGLE active archetype CSS (Zero-Waste Invariant)
        $active = self::get_active_archetype();
        $archetype_file = $dist_path . "/archetypes/{$active}.css";
        if (file_exists($archetype_file)) {
            $archetype_css = file_get_contents($archetype_file);
            if ($archetype_css !== false) {
                echo sprintf("<style id='ps-archetype'%s>\n%s\n</style>\n", $nonce_attr, $archetype_css);
            }
        }

        // 3. Inline cached host tokens CSS
        $host_tokens = TokenHarvester::get_host_tokens_css();
        if ($host_tokens !== '') {
            echo sprintf("<style id='ps-host-tokens'%s>\n%s\n</style>\n", $nonce_attr, $host_tokens);
        }
    }

    /**
     * Register client-side plugin data under the standard window.wpdev[pluginName] namespace.
     * Uses wp_add_inline_script with Object.assign to support multi-call merging and prevent
     * legacy wp_localize_script stringification (SPEC §6, Plan 7, ADR D8).
     *
     * @param string $handle Script handle to attach the inline script before.
     * @param string $plugin_name Plugin identifier (e.g. 'wpdev_sample' or 'myPlugin').
     * @param array<string, mixed> $data Configuration dictionary (endpoint, nonceEndpoint, locale, etc.).
     * @return bool True if registered, false otherwise.
     */
    public static function register_client_data(string $handle, string $plugin_name, array $data): bool {
        if (!function_exists('wp_add_inline_script') || !function_exists('wp_json_encode')) {
            return false;
        }

        $camel_name = self::to_camel_case($plugin_name);
        $json = wp_json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        if ($json === false) {
            return false;
        }

        $escaped = function_exists('esc_js') ? esc_js($camel_name) : addslashes($camel_name);
        $js = sprintf(
            'window.wpdev=window.wpdev||{};window.wpdev["%s"]=Object.assign(window.wpdev["%s"]||{},%s);',
            $escaped,
            $escaped,
            $json
        );

        return (bool) wp_add_inline_script($handle, $js, 'before');
    }

    /**
     * Convert dash/underscore string to camelCase for the JavaScript namespace.
     */
    public static function to_camel_case(string $str): string {
        $str = str_replace(['-', '_'], ' ', $str);
        $str = ucwords($str);
        $str = str_replace(' ', '', $str);

        return lcfirst($str);
    }

    /**
     * Get CSP nonce attribute if supported by host environment.
     */
    private static function get_nonce_attribute(): string {
        if (function_exists('wp_get_inline_script_tag')) {
            $tag = wp_get_inline_script_tag('');
            if (preg_match('/nonce=[\'"][^\'"]+[\'"]/', $tag, $matches)) {
                return ' ' . $matches[0];
            }
        }
        return '';
    }
}

