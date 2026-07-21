<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules\ExampleFeature;

use WPDev\Modules\ExampleFeature\Queue\DeferredSetup;
use WPDev\Support\Queue\DeferredCall;

/**
 * Fixture-style coverage for ExampleFeature DeferredCall demo
 * (mirrors queue-utils DefferCallTest patterns).
 */
class DeferredSetupTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        DeferredCall::reset_for_tests();
    }

    public function test_ready_hook_runs_queued_callback_with_params(): void
    {
        $seen = null;
        add_action(
            'wpdev_example_feature_deferred_ready',
            static function ($context) use (&$seen): void {
                $seen = $context;
            }
        );

        DeferredSetup::boot();

        $this->assertIsArray($seen);
        $this->assertSame('example-feature', $seen['module'] ?? null);
        $this->assertSame('ready', $seen['phase'] ?? null);
    }

    public function test_sync_hook_merges_hook_params(): void
    {
        $seenContext = null;
        $seenArgs = null;
        add_action(
            'wpdev_example_feature_deferred_sync',
            static function ($context, $hookArgs) use (&$seenContext, &$seenArgs): void {
                $seenContext = $context;
                $seenArgs = $hookArgs;
            },
            10,
            2
        );

        DeferredSetup::boot();

        $this->assertIsArray($seenContext);
        $this->assertSame('example-feature', $seenContext['source'] ?? null);
        $this->assertSame([1, 2, 3], $seenArgs);
    }

    public function test_queue_or_run_executes_immediately_when_hook_already_fired(): void
    {
        do_action('example_feature_late_hook');

        $ran = false;
        DeferredSetup::queue_or_run(
            'example_feature_late_hook',
            static function () use (&$ran): void {
                $ran = true;
            }
        );

        $this->assertTrue(
            $ran,
            'When the hook already fired, queue_or_run must invoke the callback immediately'
        );
        $this->assertFalse(DeferredCall::can_queue('example_feature_late_hook'));
    }

    public function test_queue_or_run_defers_until_hook_fires(): void
    {
        $ran = false;
        DeferredSetup::queue_or_run(
            'example_feature_future_hook',
            static function () use (&$ran): void {
                $ran = true;
            }
        );

        $this->assertFalse($ran, 'Callback must not run before the hook fires');
        do_action('example_feature_future_hook');
        $this->assertTrue($ran, 'Callback must run when the hook fires');
    }
}
