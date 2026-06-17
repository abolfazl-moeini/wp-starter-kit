<?php
declare(strict_types=1);

namespace WPDev\MCP\Tests\Abilities;

use PHPUnit\Framework\TestCase;
use WPDev\MCP\Abilities\AbstractAbility;

final class AbstractAbilityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_mcp_test_reset();
    }

    public function test_to_args_without_output_schema(): void
    {
        $ability = $this->makeAbility(false);
        $args    = $ability->to_args();

        $this->assertSame(
            ['label', 'description', 'input_schema', 'execute_callback', 'permission_callback'],
            array_keys($args)
        );
        $this->assertArrayNotHasKey('output_schema', $args);
    }

    public function test_to_args_with_output_schema(): void
    {
        $ability = $this->makeAbility(true);
        $args    = $ability->to_args();

        $this->assertArrayHasKey('output_schema', $args);
        $this->assertSame(['type' => 'object', 'properties' => []], $args['output_schema']);
    }

    public function test_callbacks_point_to_ability_methods(): void
    {
        $ability = $this->makeAbility(false);
        $args    = $ability->to_args();

        $this->assertSame([$ability, 'execute'], $args['execute_callback']);
        $this->assertSame([$ability, 'check_permission'], $args['permission_callback']);
    }

    private function makeAbility(bool $withOutput): AbstractAbility
    {
        return new class ($withOutput) extends AbstractAbility {
            private bool $withOutput;

            public function __construct(bool $withOutput)
            {
                $this->withOutput = $withOutput;
            }

            public function get_name(): string
            {
                return 'test/ability';
            }

            public function get_label(): string
            {
                return 'Test';
            }

            public function get_description(): string
            {
                return 'Test ability';
            }

            public function get_input_schema(): array
            {
                return ['type' => 'object', 'properties' => []];
            }

            public function get_output_schema(): array
            {
                return $this->withOutput
                    ? ['type' => 'object', 'properties' => []]
                    : [];
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