<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use WPDev\Core\Plugin;
use WPDev\Modules\ExampleFeature\Module;
use WPDev\Modules\ExampleFeature\Rest\ItemsController;
use WPDev\Support\Rest\RestSetup;

class ExampleFeatureTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        RestSetup::flush();
        Plugin::reset_for_tests();
        global $wp_rest_server, $wp_actions;
        $wp_rest_server = null;
        unset($wp_actions['rest_api_init']);
    }

    public function test_module_registers_rest_route_on_boot(): void
    {
        set_current_screen('index');
        Plugin::boot(dirname(__DIR__, 3) . '/project.config.json');
        $module = new Module();
        Plugin::loader()->register($module);
        Plugin::on_plugins_loaded();

        $this->assertTrue(Plugin::loader()->has('example-feature'));

        global $wp_rest_server, $wp_actions;
        $wp_rest_server = null;
        unset($wp_actions['rest_api_init']);
        rest_get_server();
        $routes = rest_get_server()->get_routes();
        $this->assertArrayHasKey('/wpdev/v1/items', $routes, 'REST route for items must be registered');
    }

    public function test_items_controller_returns_batch_response_shape(): void
    {
        $controller = new ItemsController();
        $request = new \WP_REST_Request('POST', '/wpdev/v1/items');
        $request->set_body_params(['cacheKey' => 'demo-key']);
        $response = $controller->rest_handler($request);

        $this->assertSame('demo-key', $response->get_data()['extra']['cacheKey']);
        $this->assertArrayHasKey('items', $response->get_data()['data']);
    }
}