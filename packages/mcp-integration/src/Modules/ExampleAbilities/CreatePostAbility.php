<?php
declare(strict_types=1);

namespace WPDev\MCP\Modules\ExampleAbilities;

use WPDev\MCP\Abilities\AbstractAbility;
use WPDev\MCP\Abilities\SchemaBuilder;
use WPDev\MCP\Core\Plugin;
use WPDev\MCP\Support\Auth\CapabilityPolicy;

/**
 * WRITE/PUBLISH example ability: create a post (draft, or published
 * when the user may publish). Demonstrates a REQUIRED input field and
 * a capability check that scales with the requested action (idea.md §5).
 */
final class CreatePostAbility extends AbstractAbility
{
    public function get_name(): string
    {
        return Plugin::ability_namespace() . '/create-post';
    }

    public function get_label(): string
    {
        return 'Create Post';
    }

    public function get_description(): string
    {
        return 'Create a new post as a draft, or publish it when the current user may publish.';
    }

    public function get_input_schema(): array
    {
        return SchemaBuilder::object()
            ->prop('title', 'string', true, ['description' => 'The post title.'])
            ->prop('content', 'string', false, ['description' => 'The post body (HTML allowed).'])
            ->prop('publish', 'boolean', false, ['description' => 'Publish immediately if allowed.'])
            ->to_array();
    }

    public function get_output_schema(): array
    {
        return SchemaBuilder::object()
            ->prop('id', 'number', true, ['description' => 'The new post ID (0 on failure).'])
            ->prop('status', 'string', true, ['description' => 'Resulting post status.'])
            ->to_array();
    }

    /**
     * Least privilege: creating requires edit_posts. The publish path
     * is additionally gated inside execute() with publish_posts so a
     * user who can edit but not publish cannot publish via the publish
     * flag. Never return a hardcoded true (idea.md §5).
     */
    public function check_permission(): bool
    {
        return CapabilityPolicy::can('edit_posts');
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public function execute(array $input): array
    {
        $title = isset($input['title']) ? (string) $input['title'] : '';
        if ($title === '') {
            return ['id' => 0, 'status' => 'error:missing-title'];
        }
        if (function_exists('sanitize_text_field')) {
            $title = \sanitize_text_field($title);
        }

        $content = isset($input['content']) ? (string) $input['content'] : '';
        if (function_exists('wp_kses_post')) {
            $content = \wp_kses_post($content);
        }

        $wantsPublish = !empty($input['publish']);
        $canPublish   = CapabilityPolicy::can('publish_posts');
        $status       = ($wantsPublish && $canPublish) ? 'publish' : 'draft';

        if (!function_exists('wp_insert_post')) {
            // Test/non-WordPress fallback: deterministic stub.
            return ['id' => 123, 'status' => $status];
        }

        $id = \wp_insert_post([
            'post_title'   => $title,
            'post_content' => $content,
            'post_status'  => $status,
        ]);

        return ['id' => (int) $id, 'status' => $status];
    }
}