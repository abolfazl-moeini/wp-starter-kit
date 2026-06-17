<?php
declare(strict_types=1);

namespace WPDev\MCP\Tests\Support;

use PHPUnit\Framework\TestCase;
use WPDev\MCP\Support\Auth\CapabilityPolicy;

final class CapabilityPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_mcp_test_reset();
    }

    public function test_can_returns_true_when_capability_granted(): void
    {
        $GLOBALS['wpdev_mcp_caps']['read'] = true;

        $this->assertTrue(CapabilityPolicy::can('read'));
    }

    public function test_can_returns_false_when_capability_not_granted(): void
    {
        unset($GLOBALS['wpdev_mcp_caps']['manage_options']);

        $this->assertFalse(CapabilityPolicy::can('manage_options'));
    }
}