<?php
declare(strict_types=1);

namespace WPDev\Support\AccessManager;

/**
 * WordPress capability-based access qualifier.
 *
 * Extend this class and implement describe() to declare named access rules
 * with BluePrint::any() / all() / custom(). Then call have_access('rule-id')
 * from REST permission_callback, admin menus, or anywhere else.
 *
 * Prefer this over scattering current_user_can() calls across the codebase —
 * one describe() map is the single source of truth for feature access.
 *
 * @since 1.0.0
 */
abstract class UserAccess extends QualifierBase
{
    /**
     * @param list<array{condition: string, type: string, values: mixed}> $rules
     */
    protected function check(array $rules): bool
    {
        foreach ($rules as $rule) {
            if (!$this->check_access($rule)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param array{condition: string, type: string, values: mixed} $rule
     */
    protected function check_access(array $rule): bool
    {
        $cond = $rule['condition'];
        $callback = [$this, 'check_' . $cond];

        if (!is_callable($callback)) {
            return false;
        }

        return (bool) call_user_func($callback, $rule['values'], $rule['type']);
    }

    /**
     * @param list<string> $caps
     */
    protected function check_any(array $caps, string $type): bool
    {
        foreach ($caps as $cap) {
            if ($type === 'current' && $this->current_user_can($cap)) {
                return true;
            }
            if ($type === 'upper' && $this->upper_current_user_can($cap)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param list<string> $caps
     */
    protected function check_all(array $caps, string $type): bool
    {
        foreach ($caps as $cap) {
            if ($type === 'current' && !$this->current_user_can($cap)) {
                return false;
            }
            if ($type === 'upper' && !$this->upper_current_user_can($cap)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param callable $callback
     */
    protected function check_custom(callable $callback): bool
    {
        return (bool) call_user_func($callback, $callback);
    }

    /**
     * Check the active user for a capability.
     */
    protected function current_user_can(string $capability): bool
    {
        if (!function_exists('current_user_can')) {
            return false;
        }

        return (bool) current_user_can($capability);
    }

    /**
     * Check the "upper" user (User Switching plugin) for a capability.
     *
     * Returns false when the plugin is not active or no switch is in effect.
     */
    public function upper_current_user_can(string $capability): bool
    {
        if (!function_exists('current_user_switched')) {
            return false;
        }

        $upper_user = current_user_switched();
        if (!$upper_user) {
            return false;
        }

        return (bool) user_can($upper_user, $capability);
    }
}
