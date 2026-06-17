<?php
declare(strict_types=1);

namespace WPDev\Support\Queue;

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
     * Priority that run_queue() is currently registered at, per hook.
     * Tracked so a subsequent queue() call with a different priority
     * can re-register the callback at the new priority — without this,
     * the first queue()'s priority would silently win forever (the
     * "priority drift" bug).
     *
     * @var array<string, int>
     */
    private static array $priorities = [];

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

        // First registration for this hook: nothing to remove, just
        // register at the requested priority.
        if (!has_action($hook, $queueCallback)) {
            add_action($hook, $queueCallback, $priority, 99);
            self::$priorities[$hook] = $priority;
        } elseif ((self::$priorities[$hook] ?? null) !== $priority) {
            // Priority changed since the first queue(). WordPress has
            // no priority-update helper for add_action, so the only
            // way to make the new priority "win" is to drop the stale
            // registration (remove_action without a priority arg
            // removes every priority bucket for that callback) and
            // re-register at the new priority. Leaving both in place
            // would fire run_queue() twice — once at each priority —
            // and each fire would re-run every queued callback.
            remove_action($hook, $queueCallback);
            add_action($hook, $queueCallback, $priority, 99);
            self::$priorities[$hook] = $priority;
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

    public static function run_queue(...$args): void
    {
        $current = current_filter();
        $items   = self::get_stack($current);

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
        self::$priorities = [];
    }
}
