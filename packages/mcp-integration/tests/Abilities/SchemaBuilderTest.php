<?php
declare(strict_types=1);

namespace WPDev\MCP\Tests\Abilities;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use WPDev\MCP\Abilities\SchemaBuilder;

final class SchemaBuilderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpdev_mcp_test_reset();
    }

    public function test_required_property_produces_required_key(): void
    {
        $schema = SchemaBuilder::object()
            ->prop('title', 'string', true)
            ->to_array();

        $this->assertSame(
            [
                'type'       => 'object',
                'properties' => [
                    'title' => ['type' => 'string'],
                ],
                'required'   => ['title'],
            ],
            $schema
        );
    }

    public function test_invalid_type_throws(): void
    {
        $this->expectException(InvalidArgumentException::class);

        SchemaBuilder::object()->prop('count', 'integer', false);
    }

    public function test_no_required_props_omits_required_key(): void
    {
        $schema = SchemaBuilder::object()
            ->prop('title', 'string', false)
            ->to_array();

        $this->assertArrayNotHasKey('required', $schema);
    }
}