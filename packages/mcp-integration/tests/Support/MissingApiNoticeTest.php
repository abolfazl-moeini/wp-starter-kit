<?php
declare(strict_types=1);

namespace WPDev\MCP\Tests\Support;

use PHPUnit\Framework\TestCase;
use WPDev\MCP\Support\Admin\MissingApiNotice;

final class MissingApiNoticeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_mcp_test_reset();
        MissingApiNotice::reset_for_tests();
    }

    public function test_queue_adds_admin_notices_callback(): void
    {
        MissingApiNotice::queue();

        $this->assertCount(1, $GLOBALS['wpdev_mcp_actions']['admin_notices'] ?? []);
    }

    public function test_queue_is_idempotent(): void
    {
        MissingApiNotice::queue();
        MissingApiNotice::queue();

        $this->assertCount(1, $GLOBALS['wpdev_mcp_actions']['admin_notices'] ?? []);
    }

    public function test_render_echoes_abilities_api_message(): void
    {
        ob_start();
        MissingApiNotice::render();
        $output = (string) ob_get_clean();

        $this->assertStringContainsString('Abilities API', $output);
    }
}