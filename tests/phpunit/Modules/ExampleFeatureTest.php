<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use PHPUnit\Framework\TestCase;
use WPDev\Core\Plugin;
use WPDev\Modules\ExampleFeature\Module;
use WPDev\Modules\ExampleFeature\Rest\ItemsController;
use WPDev\Support\Rest\RestSetup;

class ExampleFeatureTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpsk_test_reset_wp_state();
        RestSetup::flush();
        Plugin::reset_for_tests();
    }

    public function test_module_registers_rest_route_on_boot(): void
    {
        Plugin::boot(dirname(__DIR__, 3) . '/project.config.json');
        $module = new Module();
        Plugin::loader()->register($module);
        Plugin::on_plugins_loaded();
        RestSetup::rest_init();

        $this->assertTrue(Plugin::loader()->has('example-feature'));

        $routes = array_filter(
            $GLOBALS['wpsk_wp_rest_routes'],
            static fn (array $route): bool => $route['route'] === 'items'
        );

        $this->assertNotEmpty($routes);
    }

    public function test_items_controller_returns_batch_response_shape(): void
    {
        $controller = new ItemsController();
        $response = $controller->rest_handler(
            new \WP_REST_Request(['cacheKey' => 'demo-key'])
        );

        $this->assertSame('demo-key', $response->data['extra']['cacheKey']);
        $this->assertArrayHasKey('items', $response->data['data']);
    }
}