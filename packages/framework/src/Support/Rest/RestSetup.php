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

        // Fail fast on misconfigured class strings. Without this check,
        // the error would surface inside rest_init() as a cryptic
        // "Class 'X' not found" — or a TypeError when WP's
        // register_rest_route() tries to invoke a non-RestHandler
        // instance. Both are hard to diagnose from a stack trace; the
        // return-false contract here lets the caller log + skip the
        // bad route without breaking the rest of the registration.
        if (! is_string( $classname ) || ! class_exists( $classname ) ) {
            return false;
        }
        if ( ! is_subclass_of( $classname, RestHandler::class ) ) {
            return false;
        }

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
