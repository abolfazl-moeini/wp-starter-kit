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
}