<?php
define('WP_STARTER_KIT_TEST', true);

$GLOBALS['wpsk_wp_actions'] = [];
$GLOBALS['wpsk_wp_actions_fired'] = [];
$GLOBALS['wpsk_wp_current_filter'] = '';
$GLOBALS['wpsk_wp_rest_routes'] = [];
$GLOBALS['wpsk_wp_shortcodes'] = [];
$GLOBALS['wpsk_wp_transients'] = [];
$GLOBALS['wpsk_wp_current_user_caps'] = ['read' => true];

if (!function_exists('wpsk_test_reset_wp_state')) {
    function wpsk_test_reset_wp_state(): void
    {
        $GLOBALS['wpsk_wp_actions'] = [];
        $GLOBALS['wpsk_wp_actions_fired'] = [];
        $GLOBALS['wpsk_wp_current_filter'] = '';
        $GLOBALS['wpsk_wp_rest_routes'] = [];
        $GLOBALS['wpsk_wp_shortcodes'] = [];
        $GLOBALS['wpsk_wp_transients'] = [];
        $GLOBALS['wpsk_wp_current_user_caps'] = ['read' => true];
        // Per-test call log for wp_enqueue_* / wp_register_* /
        // wp_set_script_translations shims. The shims use isset()
        // before pushing so the variable MUST be initialized here;
        // otherwise calls silently disappear and tests see empty
        // arrays when they assert 'wp_enqueue_style must have been
        // called'.
        $GLOBALS['wpsk_test_wp_calls'] = [];
    }
}

if (!function_exists('add_action')) {
    function add_action($hook, $callback, $priority = 10, $accepted_args = 1)
    {
        $GLOBALS['wpsk_wp_actions'][$hook][(int) $priority][] = $callback;
    }
}
if (!function_exists('add_filter')) {
    function add_filter($hook, $callback, $priority = 10, $accepted_args = 1)
    {
        add_action($hook, $callback, $priority, $accepted_args);
    }
}
if (!function_exists('do_action')) {
    function do_action($hook, ...$args)
    {
        $GLOBALS['wpsk_wp_actions_fired'][] = $hook;
        $GLOBALS['wpsk_wp_current_filter'] = $hook;
        $callbacks = $GLOBALS['wpsk_wp_actions'][$hook] ?? [];
        ksort($callbacks);
        foreach ($callbacks as $priorityCallbacks) {
            foreach ($priorityCallbacks as $callback) {
                call_user_func_array($callback, $args);
            }
        }
        $GLOBALS['wpsk_wp_current_filter'] = '';
    }
}
if (!function_exists('did_action')) {
    function did_action($hook)
    {
        return in_array($hook, $GLOBALS['wpsk_wp_actions_fired'], true);
    }
}
if (!function_exists('has_action')) {
    function has_action($hook, $callback = null)
    {
        if (!isset($GLOBALS['wpsk_wp_actions'][$hook])) {
            return false;
        }
        if ($callback === null) {
            return true;
        }
        foreach ($GLOBALS['wpsk_wp_actions'][$hook] as $priorityCallbacks) {
            if (in_array($callback, $priorityCallbacks, true)) {
                return true;
            }
        }
        return false;
    }
}
if (!function_exists('remove_action')) {
    /**
     * Test stub for WordPress's remove_action(). When no priority is
     * given, all instances of the callback are dropped across every
     * priority — mirroring WordPress's actual behaviour (WP iterates
     * every priority bucket when the third arg is omitted).
     */
    function remove_action($hook, $callback, $priority = null)
    {
        if (!isset($GLOBALS['wpsk_wp_actions'][$hook])) {
            return;
        }
        if ($priority === null) {
            foreach ($GLOBALS['wpsk_wp_actions'][$hook] as $prio => $cbs) {
                $GLOBALS['wpsk_wp_actions'][$hook][$prio] = array_values(
                    array_filter($cbs, static fn($c) => $c !== $callback)
                );
                if (empty($GLOBALS['wpsk_wp_actions'][$hook][$prio])) {
                    unset($GLOBALS['wpsk_wp_actions'][$hook][$prio]);
                }
            }
            return;
        }
        if (!isset($GLOBALS['wpsk_wp_actions'][$hook][(int) $priority])) {
            return;
        }
        $GLOBALS['wpsk_wp_actions'][$hook][(int) $priority] = array_values(
            array_filter(
                $GLOBALS['wpsk_wp_actions'][$hook][(int) $priority],
                static fn($c) => $c !== $callback
            )
        );
        if (empty($GLOBALS['wpsk_wp_actions'][$hook][(int) $priority])) {
            unset($GLOBALS['wpsk_wp_actions'][$hook][(int) $priority]);
        }
    }
}
if (!function_exists('current_filter')) {
    function current_filter()
    {
        return $GLOBALS['wpsk_wp_current_filter'] ?? '';
    }
}
if (!function_exists('wp_enqueue_script')) {
    function wp_enqueue_script(...$args) {
        if (isset($GLOBALS['wpsk_test_wp_calls'])) {
            $GLOBALS['wpsk_test_wp_calls'][] = ['fn' => 'wp_enqueue_script', 'args' => $args];
        }
    }
}
if (!function_exists('wp_register_script')) {
    function wp_register_script(...$args) {
        if (isset($GLOBALS['wpsk_test_wp_calls'])) {
            $GLOBALS['wpsk_test_wp_calls'][] = ['fn' => 'wp_register_script', 'args' => $args];
        }
    }
}
if (!function_exists('wp_register_style')) {
    function wp_register_style(...$args) {
        if (isset($GLOBALS['wpsk_test_wp_calls'])) {
            $GLOBALS['wpsk_test_wp_calls'][] = ['fn' => 'wp_register_style', 'args' => $args];
        }
    }
}
if (!function_exists('wp_enqueue_style')) {
    function wp_enqueue_style(...$args) {
        if (isset($GLOBALS['wpsk_test_wp_calls'])) {
            $GLOBALS['wpsk_test_wp_calls'][] = ['fn' => 'wp_enqueue_style', 'args' => $args];
        }
    }
}
if (!function_exists('wp_set_script_translations')) {
    function wp_set_script_translations($handle, $domain = 'default', $path = '') {
        if (isset($GLOBALS['wpsk_test_wp_calls'])) {
            $GLOBALS['wpsk_test_wp_calls'][] = [
                'fn'   => 'wp_set_script_translations',
                'args' => [$handle, $domain, $path],
            ];
        }
    }
}
if (!function_exists('wp_localize_script')) {
    function wp_localize_script(...$args) {
        if (isset($GLOBALS['wpsk_test_wp_calls'])) {
            $GLOBALS['wpsk_test_wp_calls'][] = ['fn' => 'wp_localize_script', 'args' => $args];
        }
    }
}
if (!function_exists('add_query_arg')) {
    function add_query_arg($key, $value = null, $url = '') {
        if (is_array($key)) {
            $pairs = $key;
        } else {
            $pairs = [$key => $value];
        }
        $sep = (strpos($url, '?') === false) ? '?' : '&';
        $url .= $sep . http_build_query($pairs, '', '&');
        return $url;
    }
}
if (!function_exists('get_template_directory')) {
    function get_template_directory() {
        return dirname(__DIR__, 2);
    }
}
if (!function_exists('get_template_directory_uri')) {
    function get_template_directory_uri() {
        return 'http://example.test/wp-content/themes/wpdev-starter';
    }
}
if (!function_exists('plugins_url')) {
    function plugins_url($path = '', $plugin = '') {
        return 'http://example.test/wp-content/plugins/' . ltrim($path, '/');
    }
}
if (!function_exists('plugin_dir_path')) {
    // wp-starter-kit IS the plugin; its root is the test root (parent of tests/).
    // Mirrors real WP behaviour: `plugin_dir_path(__FILE__)` from a file inside
    // the plugin returns the plugin's filesystem root with a trailing slash.
    function plugin_dir_path($file) {
        // Test override: when a test sets $GLOBALS['wpsk_test_plugin_dir'],
        // the stub returns that path so the test can simulate a plugin
        // installed at an arbitrary location (e.g. a temp dir that is
        // distinct from the theme dir). Used by tests that need to
        // distinguish "the plugin location" from "the theme location" —
        // the production paths happen to be identical under the test root.
        if (!empty($GLOBALS['wpsk_test_plugin_dir'])) {
            return rtrim((string) $GLOBALS['wpsk_test_plugin_dir'], '/\\') . '/';
        }
        // __FILE__ under tests/phpunit/bootstrap.php → project root.
        $root = dirname(__DIR__, 2);
        return rtrim($root, '/\\') . '/';
    }
}
if (!function_exists('wp_create_nonce')) {
    function wp_create_nonce($action = -1) {
        return 'test-nonce';
    }
}
if (!function_exists('rest_url')) {
    function rest_url($path = '') {
        return 'http://example.test/wp-json/' . ltrim($path, '/');
    }
}
if (!function_exists('sanitize_url')) {
    function sanitize_url($url) {
        return $url;
    }
}
if (!function_exists('untrailingslashit')) {
    function untrailingslashit($string) {
        return rtrim($string, '/\\');
    }
}
if (!function_exists('register_rest_route')) {
    function register_rest_route($namespace, $route, $args = [])
    {
        $GLOBALS['wpsk_wp_rest_routes'][] = [
            'namespace' => $namespace,
            'route'     => $route,
            'args'      => $args,
        ];
        return true;
    }
}
if (!function_exists('shortcode_atts')) {
    function shortcode_atts($pairs, $atts, $shortcode = '')
    {
        $atts = is_array($atts) ? $atts : [];
        $out = [];
        foreach ($pairs as $name => $default) {
            $out[$name] = array_key_exists($name, $atts) ? $atts[$name] : $default;
        }
        return $out;
    }
}
if (!function_exists('add_shortcode')) {
    function add_shortcode($tag, $callback)
    {
        $GLOBALS['wpsk_wp_shortcodes'][$tag] = $callback;
    }
}
if (!function_exists('wp_kses_post')) {
    function wp_kses_post($data)
    {
        return is_string($data) ? $data : '';
    }
}
if (!function_exists('sanitize_text_field')) {
    /**
     * Minimal WordPress-compatible sanitize_text_field() stub for the
     * test bootstrap. Mirrors the real WP semantics in tests/phpunit:
     *
     *   - Strips control characters (\x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F)
     *     except \t, \n, \r (those collapse to a single space).
     *   - Collapses runs of spaces to one.
     *   - Trims leading / trailing whitespace.
     *
     * NOTE: this stub does NOT strip HTML tags (neither does the real
     * sanitize_text_field() in WordPress — that's wp_strip_all_tags()).
     * The tests that exercise the real sanitization pass control chars
     * and whitespace, not raw HTML.
     */
    function sanitize_text_field($str)
    {
        if (is_object($str) || is_array($str)) {
            return '';
        }
        $str = (string) $str;
        $str = preg_replace('/[\r\n\t]+/', ' ', $str);
        $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $str);
        $str = preg_replace('/ +/', ' ', $str);
        return trim($str);
    }
}
if (!function_exists('esc_html')) {
    function esc_html($text)
    {
        return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
    }
}
if (!function_exists('esc_attr')) {
    function esc_attr($text)
    {
        return esc_html($text);
    }
}
if (!function_exists('current_user_can')) {
    function current_user_can($capability)
    {
        return !empty($GLOBALS['wpsk_wp_current_user_caps'][$capability]);
    }
}
if (!function_exists('get_transient')) {
    function get_transient($key)
    {
        return $GLOBALS['wpsk_wp_transients'][$key] ?? false;
    }
}
if (!function_exists('set_transient')) {
    function set_transient($key, $value, $expiration = 0)
    {
        $GLOBALS['wpsk_wp_transients'][$key] = $value;
        return true;
    }
}
if (!function_exists('delete_transient')) {
    function delete_transient($key)
    {
        unset($GLOBALS['wpsk_wp_transients'][$key]);
        return true;
    }
}
if (!function_exists('wp_remote_request')) {
    function wp_remote_request($url, $args = [])
    {
        return [
            'response' => ['code' => 200],
            'body'     => '{"ok":true}',
            'headers'  => [],
        ];
    }
}
if (!function_exists('wp_remote_retrieve_response_code')) {
    function wp_remote_retrieve_response_code($response)
    {
        return $response['response']['code'] ?? 0;
    }
}
if (!function_exists('wp_remote_retrieve_body')) {
    function wp_remote_retrieve_body($response)
    {
        return $response['body'] ?? '';
    }
}
if (!function_exists('is_wp_error')) {
    function is_wp_error($thing)
    {
        return $thing instanceof WP_Error;
    }
}
if (!class_exists('WP_Error')) {
    class WP_Error
    {
        public $code;
        public string $message;
        public function __construct($code = '', $message = '')
        {
            $this->code = $code;
            $this->message = (string) $message;
        }
        public function get_error_code()
        {
            return $this->code;
        }
        public function get_error_message()
        {
            return $this->message;
        }
    }
}
if (!function_exists('is_admin')) {
    function is_admin()
    {
        return !empty($GLOBALS['wpsk_test_is_admin']);
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        /** @var array<string,mixed> */
        private array $params = [];

        public function __construct(array $params = [])
        {
            $this->params = $params;
        }

        public function get_param($key)
        {
            return $this->params[$key] ?? null;
        }
    }
}
if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response
    {
        public $data;
        public $status;
        public function __construct($data = null, $status = 200)
        {
            $this->data = $data;
            $this->status = $status;
        }
    }
}