<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use PHPUnit\Framework\TestCase;
use WPDev\Modules\ExampleFeature\Rest\ItemsController;

/**
 * Security contract tests for the in-scope ExampleFeature/Rest/ItemsController.
 *
 * These tests lock in two security fixes raised in the PHP review:
 *
 *   1. `rest_handler()` must sanitize the `cacheKey` REST parameter
 *      before reflecting it into the response payload. Untrusted
 *      cache keys could otherwise carry control characters, null
 *      bytes, or other bytes that confuse log aggregators, browser
 *      caching layers, or downstream services (e.g. localStorage
 *      keys, IndexedDB column names).
 *
 *   2. `rest_permission()` must NOT rely on the `read` capability for
 *      a POST endpoint. The `read` cap is granted to every logged-in
 *      user (including subscribers), so using it as the authorization
 *      gate for a state-changing endpoint is a privilege-escalation
 *      footgun. The example must use a more restrictive cap
 *      (`edit_posts` by default).
 */
class ExampleFeatureSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpsk_test_reset_wp_state();
    }

    public function test_cache_key_strips_control_characters(): void
    {
        $controller = new ItemsController();
        // \x07 = BEL, \x00 = NUL — both are stripped by sanitize_text_field().
        $response = $controller->rest_handler(
            new \WP_REST_Request(['cacheKey' => "evil\x07\x00key"])
        );

        $this->assertIsArray($response->data);
        $this->assertArrayHasKey('extra', $response->data);
        $this->assertSame(
            'evilkey',
            $response->data['extra']['cacheKey'],
            'cacheKey in response must be sanitize_text_field()-cleaned (no control characters / null bytes)'
        );
    }

    public function test_cache_key_normalises_whitespace(): void
    {
        $controller = new ItemsController();
        $response = $controller->rest_handler(
            new \WP_REST_Request(['cacheKey' => "  multi  spaces  here  "])
        );

        $this->assertSame(
            'multi spaces here',
            $response->data['extra']['cacheKey'],
            'cacheKey must be sanitize_text_field()-cleaned (leading/trailing trimmed, runs collapsed)'
        );
    }

    public function test_cache_key_passes_through_safe_values(): void
    {
        $controller = new ItemsController();
        $response = $controller->rest_handler(
            new \WP_REST_Request(['cacheKey' => 'demo-key_42'])
        );

        $this->assertSame(
            'demo-key_42',
            $response->data['extra']['cacheKey'],
            'A safe cacheKey must pass through untouched (preserves the existing test contract)'
        );
    }

    public function test_permission_denies_subscribers_with_only_read_cap(): void
    {
        // The bootstrap grants `read => true` by default. Strip `edit_posts`
        // explicitly to model a logged-in subscriber. If the controller's
        // permission gate is the `read` cap, this test would (incorrectly)
        // return true. The fix is to require a more restrictive cap.
        unset($GLOBALS['wpsk_wp_current_user_caps']['edit_posts']);
        $GLOBALS['wpsk_wp_current_user_caps']['read'] = true;

        $controller = new ItemsController();
        $this->assertFalse(
            $controller->rest_permission(),
            'rest_permission() must NOT pass for a user with only the read cap on a POST endpoint'
        );
    }

    public function test_permission_allows_user_with_edit_posts_cap(): void
    {
        // Author / editor / contributor all have `edit_posts`.
        $GLOBALS['wpsk_wp_current_user_caps']['read'] = true;
        $GLOBALS['wpsk_wp_current_user_caps']['edit_posts'] = true;

        $controller = new ItemsController();
        $this->assertTrue(
            $controller->rest_permission(),
            'rest_permission() must return true for a user with edit_posts'
        );
    }
}
