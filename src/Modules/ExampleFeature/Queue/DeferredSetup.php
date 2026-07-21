<?php
declare(strict_types=1);

namespace WPDev\Modules\ExampleFeature\Queue;

use WPDev\Support\Queue\DeferredCall;

/**
 * Canonical DeferredCall examples for the starter kit.
 *
 * Mirrors the patterns from queue-utils DefferCallTest:
 *
 * 1. Queue a callback before the hook fires → runs on do_action (params only).
 * 2. merge_hook_params → fixed params first, then args from do_action(...).
 * 3. queue() / can_queue() return false when the hook already fired → run now.
 *
 * Prefer DeferredCall over ad-hoc "if (did_action()) … else add_action()"
 * when boot order is uncertain.
 *
 * @see \WPDev\Support\Queue\DeferredCall
 */
final class DeferredSetup
{
    /** Demo hook: basic params-only queue (pattern 1). */
    public const READY_HOOK = 'wpdev_example_feature_ready';

    /** Demo hook: params + merge_hook_params (pattern 2). */
    public const SYNC_HOOK = 'wpdev_example_feature_sync';

    /**
     * Register deferred demos from Module::boot().
     *
     * Fires READY_HOOK and SYNC_HOOK once so the examples run in a
     * normal request. In real modules you usually only queue() here and
     * let another component fire the hook later.
     */
    public static function boot(): void
    {
        // --- Pattern 1: queue with fixed params (see DefferCallTest::queueACallbackWithValidOptions) ---
        DeferredCall::queue(self::READY_HOOK, [
            'callback' => [self::class, 'on_ready'],
            'params'   => [
                [
                    'module' => 'example-feature',
                    'phase'  => 'ready',
                ],
            ],
            'priority' => 10,
        ]);

        // --- Pattern 2: merge do_action() args after params (see itShouldPassHooksArgs) ---
        DeferredCall::queue(self::SYNC_HOOK, [
            'callback'          => [self::class, 'on_sync'],
            'params'            => [
                [
                    'source' => 'example-feature',
                ],
            ],
            'merge_hook_params' => true,
            'priority'          => 10,
        ]);

        // Demo fires — replace with real producers in production code.
        if (function_exists('do_action')) {
            do_action(self::READY_HOOK);
            do_action(self::SYNC_HOOK, 1, 2, 3);
        }
    }

    /**
     * Pattern 3: queue work for $hook, or run immediately if it already fired.
     *
     * Use when Module::boot() may run before or after the target hook
     * (e.g. admin_init, init) depending on load order.
     *
     * @see DefferCallTest::tryToQueueAHookThatIsFiredBefore
     */
    public static function queue_or_run(string $hook, callable $callback, int $priority = 10): void
    {
        $queued = DeferredCall::queue($hook, [
            'callback' => $callback,
            'priority' => $priority,
        ]);

        if (!$queued) {
            // Hook already fired — skip queue and run so setup is not lost.
            $callback();
        }
    }

    /**
     * @param array{module?: string, phase?: string} $context
     */
    public static function on_ready(array $context): void
    {
        // No-op demo body — replace with real late setup (options, cron, caches).
        if (function_exists('do_action')) {
            do_action('wpdev_example_feature_deferred_ready', $context);
        }
    }

    /**
     * @param array{source?: string} $context Fixed params from queue().
     * @param mixed                  ...$hookArgs From do_action(SYNC_HOOK, ...).
     */
    public static function on_sync(array $context, ...$hookArgs): void
    {
        if (function_exists('do_action')) {
            do_action('wpdev_example_feature_deferred_sync', $context, $hookArgs);
        }
    }
}
