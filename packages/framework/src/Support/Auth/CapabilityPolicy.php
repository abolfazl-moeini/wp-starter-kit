<?php
declare(strict_types=1);

namespace WPDev\Support\Auth;

use WPDev\Support\AccessManager\UserAccess;

/**
 * Capability and named-access helpers for REST and admin permission checks.
 *
 * Prefer AccessManager (UserAccess + BluePrint) for multi-rule feature access.
 * Use can() / rest_permission() only for one-off single-capability gates.
 *
 * @see \WPDev\Support\AccessManager\UserAccess
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

    /**
     * Evaluate a named access rule from a UserAccess qualifier.
     *
     * Preferred over can() when the module declares rules in describe().
     */
    public static function access(UserAccess $qualifier, string $accessId): bool
    {
        return $qualifier->have_access($accessId);
    }

    /**
     * REST permission_callback bound to a named AccessManager rule.
     *
     * @example
     *   'permission_callback' => CapabilityPolicy::rest_access(
     *       new FeatureAccess(),
     *       FeatureAccess::EDIT_ITEMS
     *   ),
     */
    public static function rest_access(UserAccess $qualifier, string $accessId): callable
    {
        return static function () use ($qualifier, $accessId): bool {
            return $qualifier->have_access($accessId);
        };
    }
}
