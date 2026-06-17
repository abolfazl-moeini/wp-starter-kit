<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for `wpdev_get_localize_data()`.
 *
 * The contract (mirrors the mrlogistic `wp_localize_script('mrlogistic-deps',
 * 'MrLogisticLoc', ...)` call in functions.php, ported to `wpdev_` prefix
 * and the WP-Starter-Kit localize var `WPDevLoc`).
 *
 * The shape is consumed by `@wpdev/utils/localize.js` via dot-notation:
 *   localize.get('api.url')   → rest URL
 *   localize.get('api.nonce') → wp_rest nonce
 *   localize.get('api_x.url') → secondary API URL
 *   localize.get('api_x.nonce') → secondary nonce
 */
class LocalizeTest extends TestCase
{
    public function test_get_localize_data_returns_expected_api_shape(): void
    {
        $data = wpdev_get_localize_data();

        $this->assertArrayHasKey('api', $data);
        $this->assertArrayHasKey('url', $data['api']);
        $this->assertArrayHasKey('nonce', $data['api']);

        $this->assertSame(rest_url(), $data['api']['url']);
        $this->assertSame(wp_create_nonce('wp_rest'), $data['api']['nonce']);
    }

    public function test_get_localize_data_returns_secondary_api_from_project_config(): void
    {
        $config = wpdev_read_project_config();
        $slug   = $config['slug'] ?? 'wpdev-starter';
        $prefix = $config['hookPrefix'] ?? 'wpdev';
        $data   = wpdev_get_localize_data();

        $this->assertArrayHasKey('api_x', $data);
        $this->assertArrayHasKey('url', $data['api_x']);
        $this->assertArrayHasKey('nonce', $data['api_x']);

        $this->assertSame(rest_url($slug . '/v1/'), $data['api_x']['url']);
        $this->assertSame(wp_create_nonce($prefix . '_rest'), $data['api_x']['nonce']);
    }

    public function test_get_localize_data_shape_matches_localize_js_consumer(): void
    {
        // The dot-notation in @wpdev/utils/localize.js does:
        //   localize.get('api.url')   -> root['api']['url']
        //   localize.get('api.nonce') -> root['api']['nonce']
        //   localize.get('api_x.url') -> root['api_x']['url']
        //   localize.get('api_x.nonce') -> root['api_x']['nonce']
        // The data structure must support each of those.
        $data = wpdev_get_localize_data();

        $this->assertArrayHasKey('url',   $data['api']);
        $this->assertArrayHasKey('nonce', $data['api']);
        $this->assertArrayHasKey('url',   $data['api_x']);
        $this->assertArrayHasKey('nonce', $data['api_x']);
    }
}
