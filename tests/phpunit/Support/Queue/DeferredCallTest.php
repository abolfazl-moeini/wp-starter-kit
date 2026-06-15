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
}