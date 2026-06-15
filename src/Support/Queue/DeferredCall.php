<?php
declare(strict_types=1);

namespace WPSK\Support\Queue;

/**
 * Deferred hook callback queue.
 *
 * Reimplemented from php-core-libs/queue-utils behavioral spec (new code).
 * - Fixes the "DefferCall" typo.
 * - Adds priority support.
 * - Validates callbacks.
 * - Refuses to queue if the hook has already fired.
 */
final class DeferredCall
{
    /** @var array<string, array<int, array>> */
    private static array $stack = [];

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

        $priority = $data['priority'] ?? 10;

        $queueCallback = [self::class, 'run_queue'];
        if (!has_action($hook, $queueCallback)) {
            add_action($hook, $queueCallback, (int)$priority, 99);
        }

        self::set_stack($hook, $data);
        return true;
    }

    public static function can_queue(string $hook): bool
    {
        return !did_action($hook);
    }

    public static function get_stack(string $hook): array
    {
        return self::$stack[$hook] ?? [];
    }

    private static function set_stack(string $hook, array $data): void
    {
        self::$stack[$hook][] = $data;
    }

    public static function run_queue(string $hook = ''): void
    {
        $current = current_filter();
        $items   = self::get_stack($current);

        foreach ($items as $item) {
            $cb = $item['callback'];
            $params = $item['params'] ?? [];

            if (!empty($item['merge_hook_params'])) {
                $params = array_merge($params, func_get_args());
            }

            call_user_func_array($cb, $params);
        }
    }

    /** @internal Test isolation only. */
    public static function reset_for_tests(): void
    {
        self::$stack = [];
    }
}
