<?php
declare(strict_types=1);

namespace WPDev\MCP\Modules\ExampleAbilities;

use WPDev\MCP\Abilities\AbstractAbility;
use WPDev\MCP\Abilities\SchemaBuilder;
use WPDev\MCP\Core\Plugin;
use WPDev\MCP\Support\Auth\CapabilityPolicy;

/**
 * READ-ONLY example ability: list recent posts.
 * Demonstrates least-privilege ('read') + an object input schema.
 */
final class GetPostsAbility extends AbstractAbility
{
    public function get_name(): string
    {
        return Plugin::ability_namespace() . '/get-posts';
    }

    public function get_label(): string
    {
        return 'Get Posts';
    }

    public function get_description(): string
    {
        return 'Return a list of recent posts, optionally filtered by a search term.';
    }

    public function get_input_schema(): array
    {
        return SchemaBuilder::object()
            ->prop('count', 'number', false, ['description' => 'How many posts to return (max 50).'])
            ->prop('search', 'string', false, ['description' => 'Optional search term.'])
            ->to_array();
    }

    public function get_output_schema(): array
    {
        return SchemaBuilder::object()
            ->prop('items', 'array', true, ['description' => 'The matched posts.'])
            ->to_array();
    }

    public function check_permission(): bool
    {
        return CapabilityPolicy::can('read');
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function execute(array $input): array
    {
        $count  = isset($input['count']) ? (int) $input['count'] : 5;
        $count  = max(1, min(50, $count)); // clamp 1..50
        $search = isset($input['search']) ? (string) $input['search'] : '';

        if (!function_exists('get_posts')) {
            // Test/non-WordPress fallback: deterministic stub.
            return ['items' => [['id' => 1, 'title' => 'Example Post']]];
        }

        $args = ['numberposts' => $count];
        if ($search !== '') {
            $args['s'] = $search;
        }

        $items = [];
        foreach (\get_posts($args) as $post) {
            $items[] = [
                'id'    => (int) $post->ID,
                'title' => (string) $post->post_title,
            ];
        }

        return ['items' => $items];
    }
}