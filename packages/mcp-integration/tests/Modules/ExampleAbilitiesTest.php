<?php
declare(strict_types=1);

namespace WPDev\MCP\Tests\Modules;

use PHPUnit\Framework\TestCase;
use WPDev\MCP\Abilities\AbilityRegistry;
use WPDev\MCP\Core\Plugin;
use WPDev\MCP\Modules\ExampleAbilities\CreatePostAbility;
use WPDev\MCP\Modules\ExampleAbilities\GetPostsAbility;
use WPDev\MCP\Modules\ExampleAbilities\Module;

final class ExampleAbilitiesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_mcp_test_reset();
        Plugin::reset_for_tests();
    }

    public function test_module_boot_registers_two_abilities(): void
    {
        $module = new Module();
        $module->boot();

        $this->assertCount(2, AbilityRegistry::instance()->all());
    }

    public function test_get_posts_check_permission_requires_read(): void
    {
        $ability = new GetPostsAbility();

        $GLOBALS['wpdev_mcp_caps']['read'] = true;
        $this->assertTrue($ability->check_permission());

        unset($GLOBALS['wpdev_mcp_caps']['read']);
        $this->assertFalse($ability->check_permission());
    }

    public function test_get_posts_execute_returns_stub_without_wordpress(): void
    {
        $ability = new GetPostsAbility();
        $result  = $ability->execute([]);

        $this->assertArrayHasKey('items', $result);
        $this->assertIsArray($result['items']);
        $this->assertNotEmpty($result['items']);
    }

    public function test_create_post_execute_returns_error_for_missing_title(): void
    {
        $ability = new CreatePostAbility();
        $result  = $ability->execute(['title' => '']);

        $this->assertSame(['id' => 0, 'status' => 'error:missing-title'], $result);
    }

    public function test_create_post_publish_requires_publish_posts_capability(): void
    {
        $ability = new CreatePostAbility();

        $GLOBALS['wpdev_mcp_caps']['edit_posts'] = true;
        unset($GLOBALS['wpdev_mcp_caps']['publish_posts']);

        $result = $ability->execute(['title' => 'Hi', 'publish' => true]);
        $this->assertSame('draft', $result['status']);

        $GLOBALS['wpdev_mcp_caps']['publish_posts'] = true;
        $result = $ability->execute(['title' => 'Hi', 'publish' => true]);
        $this->assertSame('publish', $result['status']);
    }

    public function test_ability_names_use_configured_namespace(): void
    {
        Plugin::boot(['namespace' => 'acme']);

        $ability = new GetPostsAbility();
        $this->assertSame('acme/get-posts', $ability->get_name());
    }
}