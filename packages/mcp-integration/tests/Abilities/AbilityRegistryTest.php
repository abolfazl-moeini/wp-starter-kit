<?php
declare(strict_types=1);

namespace WPDev\MCP\Tests\Abilities;

use PHPUnit\Framework\TestCase;
use WPDev\MCP\Abilities\AbstractAbility;
use WPDev\MCP\Abilities\AbilityRegistry;

final class AbilityRegistryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_mcp_test_reset();
        AbilityRegistry::reset_for_tests();
    }

    public function test_boot_registers_wp_abilities_api_init_hook(): void
    {
        $registry = AbilityRegistry::instance();
        $registry->boot();

        $this->assertCount(1, $GLOBALS['wpdev_mcp_actions']['wp_abilities_api_init'] ?? []);
    }

    public function test_register_all_queues_notice_when_api_missing(): void
    {
        $registry = AbilityRegistry::instance();
        $registry->register($this->makeAbility('test/one'));
        $registry->register_all();

        $this->assertCount(1, $GLOBALS['wpdev_mcp_actions']['admin_notices'] ?? []);
    }

    /**
     * @runInSeparateProcess
     */
    public function test_register_all_registers_abilities_when_api_present(): void
    {
        wpdev_mcp_test_reset();
        AbilityRegistry::reset_for_tests();

        // Functions defined inside a namespaced class method land in that
        // namespace, not the global namespace. Use a global namespace block.
        if (!function_exists('wp_register_ability')) {
            eval(<<<'PHP'
namespace {
    function wp_register_ability($name, $args)
    {
        $GLOBALS['wpdev_mcp_registered'][] = ['name' => $name, 'args' => $args];
        return true;
    }
}
PHP
            );
        }
        $GLOBALS['wpdev_mcp_registered'] = [];

        $registry = AbilityRegistry::instance();
        $registry->register($this->makeAbility('test/one'));
        $registry->register($this->makeAbility('test/two'));
        $registry->register_all();

        $this->assertCount(2, $GLOBALS['wpdev_mcp_registered']);
        $this->assertSame('test/one', $GLOBALS['wpdev_mcp_registered'][0]['name']);
        $this->assertSame('test/two', $GLOBALS['wpdev_mcp_registered'][1]['name']);
        $this->assertArrayHasKey('label', $GLOBALS['wpdev_mcp_registered'][0]['args']);
        $this->assertArrayHasKey('execute_callback', $GLOBALS['wpdev_mcp_registered'][0]['args']);
    }

    public function test_boot_is_idempotent(): void
    {
        $registry = AbilityRegistry::instance();
        $registry->boot();
        $registry->boot();

        $this->assertCount(1, $GLOBALS['wpdev_mcp_actions']['wp_abilities_api_init'] ?? []);
    }

    private function makeAbility(string $name): AbstractAbility
    {
        return new class ($name) extends AbstractAbility {
            private string $name;

            public function __construct(string $name)
            {
                $this->name = $name;
            }

            public function get_name(): string
            {
                return $this->name;
            }

            public function get_label(): string
            {
                return 'Label';
            }

            public function get_description(): string
            {
                return 'Description';
            }

            public function get_input_schema(): array
            {
                return ['type' => 'object', 'properties' => []];
            }

            public function execute(array $input)
            {
                return [];
            }

            public function check_permission(): bool
            {
                return true;
            }
        };
    }
}