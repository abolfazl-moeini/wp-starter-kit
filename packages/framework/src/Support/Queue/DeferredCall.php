<?php
declare(strict_types=1);

namespace WPDev\Support\Queue;

/**
 * Deferred hook callback queue.
 *
 * Reimplemented from php-core-libs/queue-utils behavioral spec (new code).
 * - Fixes the "DefferCall" typo.
 * - Supports independent priority buckets without clobbering.
 * - Drains stack prior to callback execution to prevent reentrancy loops.
 * - Validates callbacks.
 * - Refuses to queue if the hook has already fired.
 */
final class DeferredCall
{
    /**
     * Stack bucketed by hook and priority:
     * [ $hook => [ $priority => list<array> ] ]
     *
     * @var array<string, array<int, list<array>>>
     */
    private static array $stack = [];

    /**
     * Map of registered priorities per hook to prevent redundant add_action calls.
     *
     * @var array<string, array<int, bool>>
     */
    private static array $registered_priorities = [];

    /**
     * Queue a callback to run when $hook fires (if it hasn't fired yet).
     *
     * $data shape:
     *   'callback' => callable
     *   'params'   => array
     *   'merge_hook_params' => bool (merge the hook's own args into params)
     *   'priority' => int (for add_action)
     */
    public static function queue(string $hook, array $data): bool
    {
        if (!self::can_queue($hook)) {
            return false;
        }

        if (!isset($data['callback']) || !is_callable($data['callback'])) {
            throw new \InvalidArgumentException('DeferredCall requires a valid callable "callback"');
        }

        $priority = (int) ($data['priority'] ?? 10);
        $queueCallback = [self::class, 'run_queue'];

        if (!isset(self::$registered_priorities[$hook][$priority])) {
            if (function_exists('add_action')) {
                add_action($hook, $queueCallback, $priority, 99);
            }
            self::$registered_priorities[$hook][$priority] = true;
        }

        self::set_stack($hook, $priority, $data);
        return true;
    }

    public static function can_queue(string $hook): bool
    {
        return !function_exists('did_action') || !did_action($hook);
    }

    /**
     * Return all queued items for $hook across all priorities in execution order.
     *
     * @return list<array>
     */
    public static function get_stack(string $hook): array
    {
        if (!isset(self::$stack[$hook])) {
            return [];
        }

        $flat = [];
        $priorities = array_keys(self::$stack[$hook]);
        sort($priorities, SORT_NUMERIC);

        foreach ($priorities as $p) {
            foreach (self::$stack[$hook][$p] as $item) {
                $flat[] = $item;
            }
        }

        return $flat;
    }

    private static function set_stack(string $hook, int $priority, array $data): void
    {
        if (!isset(self::$stack[$hook][$priority])) {
            self::$stack[$hook][$priority] = [];
        }
        self::$stack[$hook][$priority][] = $data;
    }

    public static function run_queue(...$args): void
    {
        $current = function_exists('current_filter') ? (string) current_filter() : '';
        if ($current === '' || empty(self::$stack[$current])) {
            return;
        }

        $priority = null;

        // Try extracting active hook priority from WordPress runtime state
        global $wp_filter;
        if (isset($wp_filter[$current]) && is_object($wp_filter[$current])) {
            try {
                $ref = new \ReflectionClass($wp_filter[$current]);
                if ($ref->hasProperty('iterations') && $ref->hasProperty('nesting_level')) {
                    $iter_prop = $ref->getProperty('iterations');
                    $nest_prop = $ref->getProperty('nesting_level');
                    if (PHP_VERSION_ID < 80100) {
                        $iter_prop->setAccessible(true);
                        $nest_prop->setAccessible(true);
                    }
                    $nest = $nest_prop->getValue($wp_filter[$current]);
                    $iters = $iter_prop->getValue($wp_filter[$current]);
                    if (is_array($iters) && isset($iters[$nest])) {
                        $current_iter = $iters[$nest];
                        if (is_int($current_iter) && isset(self::$stack[$current][$current_iter])) {
                            $priority = $current_iter;
                        } elseif (is_array($current_iter)) {
                            $k = key($current_iter);
                            if (is_int($k) && isset(self::$stack[$current][$k])) {
                                $priority = $k;
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Fall back to numeric order if reflection fails
            }
        }

        if ($priority === null || !isset(self::$stack[$current][$priority])) {
            $priorities = array_keys(self::$stack[$current]);
            sort($priorities, SORT_NUMERIC);
            $priority = $priorities[0];
        }

        // Drain the priority stack before executing callbacks to eliminate reentrancy bugs
        $items = self::$stack[$current][$priority];
        unset(self::$stack[$current][$priority]);
        if (empty(self::$stack[$current])) {
            unset(self::$stack[$current]);
        }

        foreach ($items as $item) {
            $cb = $item['callback'];
            $params = $item['params'] ?? [];

            if (!empty($item['merge_hook_params'])) {
                $params = array_merge($params, $args);
            }

            call_user_func_array($cb, $params);
        }
    }

    /** @internal Test isolation only. */
    public static function reset_for_tests(): void
    {
        self::$stack = [];
        self::$registered_priorities = [];
    }
}
