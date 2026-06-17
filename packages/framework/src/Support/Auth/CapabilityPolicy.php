<?php
declare(strict_types=1);

namespace WPDev\Support\Auth;

/**
 * Thin wrappers around current_user_can() for REST permission reuse.
 */
final class CapabilityPolicy
{
    public static function can(string $capability): bool
    {
        if (!function_exists('current_user_can')) {
            return false;
        }
        return (bool) current_user_can($capability);
    }

    /**
     * Returns a closure suitable for register_rest_route permission_callback.
     */
    public static function rest_permission(string $capability): callable
    {
        return static function () use ($capability): bool {
            return self::can($capability);
        };
    }
}