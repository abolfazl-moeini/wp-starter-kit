<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use WPDev\Modules\ExampleFeature\Rest\ItemsController;

/**
 * Security contract tests for the in-scope ExampleFeature/Rest/ItemsController.
 */
class ExampleFeatureSecurityTest extends \WPDevTest\TestCases\TestCase
{
    public function test_cache_key_strips_control_characters(): void
    {
        $controller = new ItemsController();
        $request = new \WP_REST_Request('POST', '/wpdev/v1/items');
        $request->set_body_params(['cacheKey' => "evil\x07\x00key"]);
        $response = $controller->rest_handler($request);

        $data = $response->get_data();
        $this->assertIsArray($data);
        $this->assertArrayHasKey('extra', $data);
        $cacheKey = $data['extra']['cacheKey'];
        $raw = "evil\x07\x00key";
        $this->assertSame(
            sanitize_text_field($raw),
            $cacheKey,
            'cacheKey must be passed through sanitize_text_field()'
        );
        $this->assertStringStartsWith('evil', $cacheKey);
        $this->assertStringEndsWith('key', $cacheKey);
    }

    public function test_cache_key_normalises_whitespace(): void
    {
        $controller = new ItemsController();
        $request = new \WP_REST_Request('POST', '/wpdev/v1/items');
        $request->set_body_params(['cacheKey' => "  multi  spaces  here  "]);
        $response = $controller->rest_handler($request);

        $this->assertSame(
            'multi spaces here',
            $response->get_data()['extra']['cacheKey'],
            'cacheKey must be sanitize_text_field()-cleaned (leading/trailing trimmed, runs collapsed)'
        );
    }

    public function test_cache_key_passes_through_safe_values(): void
    {
        $controller = new ItemsController();
        $request = new \WP_REST_Request('POST', '/wpdev/v1/items');
        $request->set_body_params(['cacheKey' => 'demo-key_42']);
        $response = $controller->rest_handler($request);

        $this->assertSame(
            'demo-key_42',
            $response->get_data()['extra']['cacheKey'],
            'A safe cacheKey must pass through untouched (preserves the existing test contract)'
        );
    }

    public function test_permission_denies_subscribers_with_only_read_cap(): void
    {
        $this->login('subscriber');

        $controller = new ItemsController();
        $this->assertFalse(
            $controller->rest_permission(),
            'rest_permission() must NOT pass for a user with only the read cap on a POST endpoint'
        );
    }

    public function test_permission_allows_user_with_edit_posts_cap(): void
    {
        $this->login('editor');

        $controller = new ItemsController();
        $this->assertTrue(
            $controller->rest_permission(),
            'rest_permission() must return true for a user with edit_posts'
        );
    }
}