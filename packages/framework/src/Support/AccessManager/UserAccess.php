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
        if (empty($rules)) {
            return false;
        }

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
        if (empty($caps)) {
            return false;
        }

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
     * Static registry of all mock caps across all UserAccess subclasses:
     * [ targetCap => list<array{role: string, caller: string, depth: int}> ]
     *
     * @var array<string, list<array{role: string, caller: string, depth: int}>>
     */
    protected static array $static_mock_caps = [];

    /**
     * Static registry of all mapped capabilities across all UserAccess subclasses:
     * [ targetCap => list<string> (roles) ]
     *
     * @var array<string, list<string>>
     */
    protected static array $static_mapped_caps = [];

    /**
     * Idempotency guard for hook attachment.
     */
    protected static bool $filter_attached = false;

    /**
     * Registry of booted classes to prevent redundant descriptor inspection.
     *
     * @var array<string, bool>
     */
    protected static array $booted_classes = [];

    /**
     * Boot mock capabilities early (before Wordfence init:10).
     */
    public static function boot(?string $class = null): void
    {
        $class = $class ?? static::class;
        if ($class === self::class) {
            return;
        }

        if (isset(self::$booted_classes[$class])) {
            self::attach_filter();
            return;
        }
        self::$booted_classes[$class] = true;

        if (class_exists($class)) {
            $ref = new \ReflectionClass($class);
            if ($ref->isSubclassOf(self::class) && !$ref->isAbstract()) {
                /** @var self $instance */
                $instance = $ref->newInstanceWithoutConstructor();
                $blue_print = new BluePrint\BluePrint();
                $instance->describe($blue_print);

                self::register_blueprint_mock_caps($blue_print);
                self::register_blueprint_mapped_caps($blue_print);
                self::attach_filter();
            }
        }
    }

    /**
     * Register capability mappings and mock capabilities during WordPress initialization.
     */
    public static function register(?string $class = null): void
    {
        static::boot($class);
    }

    /**
     * Register mock caps from a BluePrint into static state.
     */
    protected static function register_blueprint_mock_caps(BluePrint\BluePrint $blue_print): void
    {
        foreach ($blue_print->get_mock_caps() as $target_cap => $rules) {
            if (!isset(self::$static_mock_caps[$target_cap])) {
                self::$static_mock_caps[$target_cap] = [];
            }
            foreach ($rules as $rule) {
                self::$static_mock_caps[$target_cap][] = $rule;
            }
        }
    }

    /**
     * Register mapped capabilities from a BluePrint into static state.
     */
    protected static function register_blueprint_mapped_caps(BluePrint\BluePrint $blue_print): void
    {
        foreach ($blue_print->get_mapped_caps() as $cap => $roles) {
            if (!isset(self::$static_mapped_caps[$cap])) {
                self::$static_mapped_caps[$cap] = [];
            }
            foreach ($roles as $role) {
                if (!in_array($role, self::$static_mapped_caps[$cap], true)) {
                    self::$static_mapped_caps[$cap][] = $role;
                }
            }
        }
    }

    /**
     * Ensure the user_has_cap filter is attached (idempotent and resilient to hook resets).
     */
    protected static function attach_filter(): void
    {
        if (function_exists('has_filter') && has_filter('user_has_cap', [self::class, 'filter_contextual_mock_caps'])) {
            self::$filter_attached = true;
            return;
        }

        if ((!empty(self::$static_mock_caps) || !empty(self::$static_mapped_caps)) && function_exists('add_filter')) {
            add_filter('user_has_cap', [self::class, 'filter_contextual_mock_caps'], 10, 4);
            self::$filter_attached = true;
        }
    }

    /**
     * Override structure() to register mock caps lazily as a fallback.
     */
    protected function structure(): array
    {
        $blue_print = new BluePrint\BluePrint();
        $this->describe($blue_print);

        self::register_blueprint_mock_caps($blue_print);
        self::register_blueprint_mapped_caps($blue_print);
        self::attach_filter();

        return $blue_print->structure();
    }

    /**
     * Reentrancy guard to prevent recursive execution loops during capability filtering.
     */
    protected static bool $is_filtering = false;

    /**
     * 3-Tier Fast-Fail capability filter for contextual mocking and role mappings.
     *
     * @param array<string, bool> $allcaps
     * @param array<int, string>  $caps
     * @param array<int, mixed>   $args
     * @param mixed               $user
     * @return array<string, bool>
     */
    public static function filter_contextual_mock_caps(array $allcaps, array $caps, array $args, $user = null): array
    {
        // Reentrancy guard: short-circuit if already evaluating to prevent infinite recursion
        if (self::$is_filtering) {
            return $allcaps;
        }

        $asked_cap = $args[0] ?? '';
        if ($asked_cap === '') {
            return $allcaps;
        }

        // Fast-fail: if capability is neither mapped nor mocked, exit in O(1) immediately
        $is_mapped = isset(self::$static_mapped_caps[$asked_cap]);
        $is_mocked = isset(self::$static_mock_caps[$asked_cap]);

        if (!$is_mapped && !$is_mocked) {
            return $allcaps;
        }

        self::$is_filtering = true;
        try {
            // 1. Mapped Capabilities: In-memory dynamic granting to roles (Fast O(1) lookup)
            if ($is_mapped) {
                foreach (self::$static_mapped_caps[$asked_cap] as $role) {
                    if (!empty($allcaps[$role])) {
                        $allcaps[$asked_cap] = true;
                        return $allcaps;
                    }
                }
            }

            // 2. Mock Capabilities: 3-Tier contextual spoofing
            if (!$is_mocked) {
                return $allcaps;
            }

            $rules = self::$static_mock_caps[$asked_cap];
            foreach ($rules as $rule) {
                // Tier 2: Prerequisite Role Gate
                if (empty($allcaps[$rule['role']])) {
                    continue;
                }

                // Tier 3: Bounded Call Stack Inspection
                $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, $rule['depth']);
                foreach ($trace as $frame) {
                    $file   = $frame['file'] ?? '';
                    $class  = $frame['class'] ?? '';
                    $caller = $rule['caller'];

                    if (
                        ($class !== '' && stripos($class, $caller) !== false)
                        || ($file !== '' && (stripos($file, $caller) !== false || basename($file) === $caller))
                    ) {
                        $allcaps[$asked_cap] = true;

                        if (function_exists('do_action')) {
                            $user_id = is_object($user) && isset($user->ID) ? (int) $user->ID : 0;
                            do_action('wpdev_contextual_mock_cap_applied', $asked_cap, $rule['role'], $caller, $user_id);
                        }

                        return $allcaps;
                    }
                }
            }

            return $allcaps;
        } finally {
            self::$is_filtering = false;
        }
    }

    /**
     * Reset static state for test isolation.
     */
    public static function reset_mock_caps(): void
    {
        self::$static_mock_caps   = [];
        self::$static_mapped_caps = [];
        self::$booted_classes     = [];
        self::$is_filtering       = false;
        if (self::$filter_attached) {
            if (function_exists('remove_filter')) {
                remove_filter('user_has_cap', [self::class, 'filter_contextual_mock_caps'], 10);
            }
            self::$filter_attached = false;
        }
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
