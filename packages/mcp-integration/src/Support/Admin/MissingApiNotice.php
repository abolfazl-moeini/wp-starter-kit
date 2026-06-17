<?php
declare(strict_types=1);

namespace WPDev\MCP\Support\Admin;

/**
 * Shows a WordPress admin notice when the Abilities API
 * (wp_register_ability) is not available. Required by idea.md §2.3.
 */
final class MissingApiNotice
{
    private static bool $queued = false;

    public static function queue(): void
    {
        if (self::$queued) {
            return;
        }
        self::$queued = true;
        if (function_exists('add_action')) {
            \add_action('admin_notices', [self::class, 'render']);
        }
    }

    public static function render(): void
    {
        $message = 'wp-mcp-integration: The WordPress Abilities API is not available. '
            . 'It requires WordPress 6.9 or higher and the Abilities API to be enabled. '
            . 'Abilities were not registered.';

        $message = function_exists('esc_html') ? \esc_html($message) : $message;

        echo '<div class="notice notice-error"><p>' . $message . '</p></div>';
    }

    public static function reset_for_tests(): void
    {
        self::$queued = false;
    }
}