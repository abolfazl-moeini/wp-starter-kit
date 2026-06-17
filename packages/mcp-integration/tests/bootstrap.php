<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

$GLOBALS['wpdev_mcp_actions'] = [];
$GLOBALS['wpdev_mcp_caps']    = ['read' => true];

if (!function_exists('wpdev_mcp_test_reset')) {
    function wpdev_mcp_test_reset(): void
    {
        $GLOBALS['wpdev_mcp_actions'] = [];
        $GLOBALS['wpdev_mcp_caps']    = ['read' => true];
    }
}

if (!function_exists('add_action')) {
    function add_action($hook, $callback, $priority = 10, $accepted_args = 1)
    {
        $GLOBALS['wpdev_mcp_actions'][$hook][] = $callback;
        return true;
    }
}
if (!function_exists('do_action')) {
    function do_action($hook, ...$args)
    {
        foreach ($GLOBALS['wpdev_mcp_actions'][$hook] ?? [] as $cb) {
            $cb(...$args);
        }
    }
}
if (!function_exists('current_user_can')) {
    function current_user_can($capability)
    {
        return !empty($GLOBALS['wpdev_mcp_caps'][$capability]);
    }
}
if (!function_exists('esc_html')) {
    function esc_html($text)
    {
        return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
    }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($text)
    {
        return trim(strip_tags((string) $text));
    }
}
if (!function_exists('wp_kses_post')) {
    function wp_kses_post($text)
    {
        return (string) $text;
    }
}