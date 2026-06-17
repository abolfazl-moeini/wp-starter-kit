<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\Auth;

use PHPUnit\Framework\TestCase;
use WPDev\Support\Auth\CapabilityPolicy;

class CapabilityPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_test_reset_wp_state();
    }

    public function test_can_returns_true_when_user_has_capability(): void
    {
        $GLOBALS['wpdev_wp_current_user_caps']['edit_posts'] = true;
        $this->assertTrue(CapabilityPolicy::can('edit_posts'));
    }

    public function test_can_returns_false_when_user_lacks_capability(): void
    {
        unset($GLOBALS['wpdev_wp_current_user_caps']['manage_options']);
        $this->assertFalse(CapabilityPolicy::can('manage_options'));
    }

    public function test_rest_permission_closure_reuses_can(): void
    {
        $GLOBALS['wpdev_wp_current_user_caps']['read'] = true;
        $callback = CapabilityPolicy::rest_permission('read');
        $this->assertTrue($callback());
    }
}