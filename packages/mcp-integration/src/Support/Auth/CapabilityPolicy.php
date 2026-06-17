<?php
declare(strict_types=1);

namespace WPDev\MCP\Support\Auth;

/**
 * Thin, testable wrapper around current_user_can().
 * Returns false when WordPress is not loaded (safe default).
 */
final class CapabilityPolicy
{
    public static function can(string $capability): bool
    {
        if (!function_exists('current_user_can')) {
            return false;
        }
        return (bool) \current_user_can($capability);
    }
}