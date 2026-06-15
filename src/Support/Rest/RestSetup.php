<?php
declare(strict_types=1);

namespace WPSK\Support\Rest;

use WPSK\Core\Plugin;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Central registration point for REST handlers.
 *
 * Uses dynamic namespace from project.config.json → restNamespace.
 * Reimplemented (new code) per plan.v2.md.
 */
final class RestSetup
{
    /** @var array<class-string<RestHandler>> */
    private static array $routes = [];

    public static function register(string|RestHandler $handler): bool
    {
        $classname = $handler instanceof RestHandler ? get_class($handler) : $handler;

        if (!in_array($classname, self::$routes, true)) {
            self::$routes[] = $classname;
            return true;
        }
        return false;
    }

    public static function setup(): void
    {
        add_action('rest_api_init', [self::class, 'rest_init'], 20);
    }

    public static function rest_init(): void
    {
        $config = Plugin::config();
        $namespace = $config['restNamespace'] ?? 'wpsk/v1';

        foreach (self::$routes as $handlerClass) {
            /** @var RestHandler $handler */
            $handler = new $handlerClass();

            $args = [
                'methods'             => $handler->methods(),
                'callback'            => [$handler, 'rest_response'],
                'permission_callback' => [$handler, 'rest_permission'],
            ];

            if ($handler instanceof AllowBatch) {
                $args['allow_batch'] = $handler->allow_batch();
            }

            register_rest_route($namespace, $handler->rest_end_point(), $args);
        }
    }

    public static function flush(): void
    {
        self::$routes = [];
    }

    /** @return array<class-string<RestHandler>> */
    public static function routes(): array
    {
        return self::$routes;
    }
}

// Auto-setup when WordPress is available.
if (function_exists('add_action')) {
    RestSetup::setup();
}
