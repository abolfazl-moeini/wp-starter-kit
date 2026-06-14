<?php
define('WP_STARTER_KIT_TEST', true);

if (!function_exists('add_action')) {
    function add_action($hook, $callback, $priority = 10, $accepted_args = 1) {}
}
if (!function_exists('add_filter')) {
    function add_filter($hook, $callback, $priority = 10, $accepted_args = 1) {}
}
if (!function_exists('do_action')) {
    function do_action($hook, ...$args) {}
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
if (!function_exists('wp_enqueue_style')) {
    function wp_enqueue_style(...$args) {
        if (isset($GLOBALS['wpsk_test_wp_calls'])) {
            $GLOBALS['wpsk_test_wp_calls'][] = ['fn' => 'wp_enqueue_style', 'args' => $args];
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
        return 'http://example.test/wp-content/themes/wpsk-starter';
    }
}
if (!function_exists('plugins_url')) {
    function plugins_url($path = '', $plugin = '') {
        return 'http://example.test/wp-content/plugins/' . ltrim($path, '/');
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