<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\Auth;

use WPDev\Support\Auth\CapabilityPolicy;

class CapabilityPolicyTest extends \WPDevTest\TestCases\TestCase
{
    public function test_can_returns_true_when_user_has_capability(): void
    {
        $this->login('editor');
        $this->assertTrue(CapabilityPolicy::can('edit_posts'));
    }

    public function test_can_returns_false_when_user_lacks_capability(): void
    {
        $this->login('subscriber');
        $this->assertFalse(CapabilityPolicy::can('manage_options'));
    }

    public function test_rest_permission_closure_reuses_can(): void
    {
        $this->login('subscriber');
        $callback = CapabilityPolicy::rest_permission('read');
        $this->assertTrue($callback());
    }

    public function test_access_delegates_to_user_access_qualifier(): void
    {
        $this->login('editor');

        $qualifier = new class extends \WPDev\Support\AccessManager\UserAccess {
            protected function describe(
                \WPDev\Support\AccessManager\BluePrint\BluePrint $blue_print
            ): void {
                $blue_print->describe('edit')->any('edit_posts');
            }
        };

        $this->assertTrue(CapabilityPolicy::access($qualifier, 'edit'));
        $this->assertTrue(CapabilityPolicy::rest_access($qualifier, 'edit')());
    }
}