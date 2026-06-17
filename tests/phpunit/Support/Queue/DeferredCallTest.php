<?php
declare(strict_types=1);

namespace WPSK\Tests\Support\Queue;

use PHPUnit\Framework\TestCase;
use WPSK\Support\Queue\DeferredCall;

class DeferredCallTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpsk_test_reset_wp_state();
        DeferredCall::reset_for_tests();
    }

    public function test_refuses_to_queue_after_hook_has_fired(): void
    {
        do_action('init');
        $this->assertFalse(DeferredCall::can_queue('init'));
        $this->assertFalse(DeferredCall::queue('init', [
            'callback' => static fn () => null,
        ]));
    }

    public function test_supports_priority(): void
    {
        DeferredCall::queue('wp_loaded', [
            'callback' => static fn () => null,
            'priority' => 5,
        ]);

        $this->assertTrue(has_action('wp_loaded', [DeferredCall::class, 'run_queue']));
    }

    public function test_validates_callback(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        DeferredCall::queue('wp_loaded', ['callback' => 'not-a-callable']);
    }

    public function test_run_queue_executes_queued_callbacks(): void
    {
        $ran = false;
        DeferredCall::queue('custom_hook', [
            'callback' => static function () use (&$ran): void {
                $ran = true;
            },
        ]);

        do_action('custom_hook');
        $this->assertTrue($ran);
    }

    public function test_run_queue_merges_hook_params(): void
    {
        $passedArgs = [];
        DeferredCall::queue('param_hook', [
            'callback' => static function (...$args) use (&$passedArgs): void {
                $passedArgs = $args;
            },
            'params' => ['initial'],
            'merge_hook_params' => true,
        ]);

        do_action('param_hook', 'second', 'third');
        $this->assertSame(['initial', 'second', 'third'], $passedArgs);
    }

    public function test_run_queue_handles_non_string_action_arguments(): void
    {
        $passedObj = null;
        DeferredCall::queue('obj_hook', [
            'callback' => static function ($obj) use (&$passedObj): void {
                $passedObj = $obj;
            },
            'merge_hook_params' => true,
        ]);

        $dummyObj = new \stdClass();
        do_action('obj_hook', $dummyObj);
        $this->assertSame($dummyObj, $passedObj);
    }

    /**
     * Regression test for B-12 (bug audit plan_8d50edf6):
     *
     * The first queue() call set the priority for the hook (via
     * add_action). Subsequent queue() calls hit the `has_action` short
     * circuit and silently kept the original priority — so the latest
     * caller's priority hint was ignored. That is "priority drift":
     * the registration drifted away from the value the most recent
     * queue() asked for.
     *
     * The fix re-registers the run_queue callback at the new priority
     * (remove_action + add_action) when a later queue() arrives with a
     * different priority.
     */
    public function test_priority_is_updated_when_a_subsequent_queue_uses_a_different_priority(): void
    {
        DeferredCall::queue('drift_hook', [
            'callback' => static fn () => null,
            'priority' => 5,
        ]);
        $this->assertArrayHasKey(
            5,
            $GLOBALS['wpsk_wp_actions']['drift_hook'],
            'first queue() registers at priority 5'
        );

        DeferredCall::queue('drift_hook', [
            'callback' => static fn () => null,
            'priority' => 99,
        ]);

        $this->assertArrayHasKey(
            99,
            $GLOBALS['wpsk_wp_actions']['drift_hook'],
            'second queue() with priority 99 must move the registration to priority 99'
        );
        $this->assertArrayNotHasKey(
            5,
            $GLOBALS['wpsk_wp_actions']['drift_hook'],
            'the stale priority-5 registration must be removed — leaving both would double-fire run_queue'
        );
    }

    public function test_priority_is_preserved_when_a_subsequent_queue_uses_the_same_priority(): void
    {
        // No remove_action / re-add_action churn when the priority
        // doesn't change — the registration must stay at 7 with a
        // single entry, not get duplicated.
        DeferredCall::queue('same_priority_hook', [
            'callback' => static fn () => null,
            'priority' => 7,
        ]);
        DeferredCall::queue('same_priority_hook', [
            'callback' => static fn () => null,
            'priority' => 7,
        ]);

        $this->assertArrayHasKey(7, $GLOBALS['wpsk_wp_actions']['same_priority_hook']);
        $this->assertCount(
            1,
            $GLOBALS['wpsk_wp_actions']['same_priority_hook'][7],
            'same-priority queues must not duplicate the run_queue registration'
        );
    }
}