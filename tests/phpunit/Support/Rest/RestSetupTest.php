<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\Rest;

use WPDev\Core\Plugin;
use WPDev\Support\Rest\AllowBatch;
use WPDev\Support\Rest\RestHandler;
use WPDev\Support\Rest\RestSetup;

class RestSetupTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        RestSetup::flush();
        Plugin::reset_for_tests();
        $this->reset_rest_server();
    }

    public function test_register_prevents_duplicate_handlers(): void
    {
        $handler = TestRestHandler::class;

        $this->assertTrue(RestSetup::register($handler));
        $this->assertFalse(RestSetup::register($handler));
        $this->assertCount(1, RestSetup::routes());
    }

    public function test_rest_init_uses_dynamic_namespace_from_config(): void
    {
        $configPath = $this->writeTempConfig(['restNamespace' => 'custom/v2']);
        Plugin::boot($configPath);

        RestSetup::register(TestRestHandler::class);
        $this->init_rest_server();

        $routes = rest_get_server()->get_routes();
        $this->assertArrayHasKey('/custom/v2/test-items', $routes, 'REST route must be registered');
    }

    public function test_allow_batch_is_passed_through(): void
    {
        Plugin::boot(dirname(__DIR__, 4) . '/project.config.json');
        RestSetup::register(BatchRestHandler::class);
        $this->init_rest_server();

        $routes = rest_get_server()->get_routes();
        $route_args = $routes['/wpdev/v1/test-items'][0] ?? $routes['/wpdev/v1/test-items'][1] ?? [];
        $this->assertArrayHasKey('allow_batch', $route_args, 'allow_batch must be in route args');
        $this->assertSame(['v1' => true], $route_args['allow_batch']);
    }

    /**
     * SECURITY: register() accepts a class-string. Without validation
     * the error would surface later inside rest_init() as a cryptic
     * "Class 'X' not found" — or worse, a TypeError deep inside WP
     * route registration. Validate the class exists AND extends
     * RestHandler at register() time so misconfigurations fail fast
     * with a clear message.
     */
    public function test_register_rejects_unknown_class_string(): void
    {
        $this->assertFalse(
            RestSetup::register('WPDev\\Tests\\Support\\Rest\\NotARealClass'),
            'register() must return false (not throw) for an unknown class so callers can fall back gracefully'
        );
        $this->assertCount(0, RestSetup::routes(), 'Failed registration must not add to the routes list');
    }

    public function test_register_rejects_class_that_does_not_extend_RestHandler(): void
    {
        $this->assertFalse(
            RestSetup::register(\stdClass::class),
            'register() must reject classes that do not implement RestHandler'
        );
        $this->assertCount(0, RestSetup::routes(), 'Rejected registration must not add to the routes list');
    }

    public function test_register_accepts_concrete_RestHandler_instance(): void
    {
        $handler = new TestRestHandler();
        $this->assertTrue(RestSetup::register($handler));
        $this->assertCount(1, RestSetup::routes());
    }

    private function reset_rest_server(): void
    {
        global $wp_rest_server, $wp_actions;

        $wp_rest_server = null;
        unset($wp_actions['rest_api_init']);
    }

    private function init_rest_server(): void
    {
        $this->reset_rest_server();
        rest_get_server();
    }

    private function writeTempConfig(array $overrides): string
    {
        $base = json_decode(
            (string) file_get_contents(dirname(__DIR__, 4) . '/project.config.json'),
            true
        );
        $merged = array_merge($base, $overrides);
        $path = sys_get_temp_dir() . '/wpdev-rest-config-' . uniqid('', true) . '.json';
        file_put_contents($path, json_encode($merged, JSON_THROW_ON_ERROR));
        return $path;
    }
}

class TestRestHandler extends RestHandler
{
    public function rest_handler(\WP_REST_Request $request): \WP_REST_Response
    {
        return new \WP_REST_Response(['ok' => true]);
    }

    public function rest_permission(): bool
    {
        return true;
    }

    public function rest_end_point(): string
    {
        return 'test-items';
    }

    public function methods(): string
    {
        return 'GET';
    }
}

class BatchRestHandler extends TestRestHandler implements AllowBatch
{
    public function allow_batch(): array
    {
        return ['v1' => true];
    }
}