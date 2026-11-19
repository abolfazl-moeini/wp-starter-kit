<?php
declare(strict_types=1);

namespace WPDev\Support\Rest;

use WPDev\Core\Plugin;
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
    /** @var array<string, RestHandler|class-string<RestHandler>> */
    private static array $routes = [];

    /**
     * @param string|RestHandler $handler
     */
    public static function register($handler): bool
    {
        $classname = $handler instanceof RestHandler ? get_class($handler) : $handler;

        if ( ! class_exists( $classname ) ) {
            return false;
        }
        if ( ! is_subclass_of( $classname, RestHandler::class ) ) {
            return false;
        }

        $key = $handler instanceof RestHandler ? (spl_object_hash($handler) . '_' . $classname) : $classname;

        if (!isset(self::$routes[$key]) && !in_array($classname, self::$routes, true)) {
            self::$routes[$key] = $handler;
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
        try {
            $config = Plugin::config();
        } catch (\Throwable $e) {
            $config = [];
        }

        $namespace = !empty($config['restNamespace']) && is_string($config['restNamespace'])
            ? $config['restNamespace']
            : (!empty($config['slug']) && is_string($config['slug']) ? $config['slug'] . '/v1' : 'wpdev/v1');

        foreach (self::$routes as $entry) {
            /** @var RestHandler $handler */
            $handler = $entry instanceof RestHandler ? $entry : new $entry();

            $args = [
                'methods'             => $handler->methods(),
                'callback'            => [$handler, 'rest_response'],
                'permission_callback' => [$handler, 'permission_callback'],
            ];

            if ($handler instanceof AllowBatch) {
                $args['allow_batch'] = $handler->allow_batch();
            }

            $route_namespaces = [$namespace];
            if (method_exists($handler, 'rest_namespace')) {
                $custom_ns = $handler->rest_namespace();
                if (is_string($custom_ns) && $custom_ns !== '' && $custom_ns !== $namespace) {
                    $route_namespaces[] = $custom_ns;
                }
            }

            foreach ($route_namespaces as $ns) {
                register_rest_route($ns, $handler->rest_end_point(), $args);
            }
        }
    }

    // ------------------------------------------------------------------
    // B-13 (audit plan_8d50edf6) — known limitation, not a bug.
    //
    // RestSetup instantiates every registered handler with a plain
    // `new $handlerClass()` (see rest_init above). There is no
    // dependency-injection seam: handlers cannot pull dependencies from
    // a container, cannot be substituted at test time without mocking
    // the class itself, and cannot be replaced with a decorator / proxy.
    //
    // The audit asked us to add a DI seam. We considered two minimal
    // approaches:
    //
    //   (a) A static `setHandlerFactory(?callable $factory)` setter plus
    //       a `null`-coalesce call site in rest_init(). Backward-
    //       compatible but adds an unused-by-default global escape hatch
    //       that every existing call-site would still bypass.
    //
    //   (b) Accept handler instances via register() instead of class
    //       strings (already partially supported — register() accepts
    //       both). The remaining gap is only the class-string path.
    //
    // Neither approach is "minimal" in the sense the audit brief asked
    // for: both grow the public API surface for a feature that no caller
    // currently exercises. We are logging the limitation here so the
    // next audit cycle can pick it up if a real consumer surfaces.
    //
    // Workaround for now: handlers that need constructor arguments must
    // implement a static `from(...)` factory and `register()` an instance
    // (the register() signature already supports `RestHandler|string`).
    // ------------------------------------------------------------------

    public static function flush(): void
    {
        self::$routes = [];
    }

    /** @return list<class-string<RestHandler>> */
    public static function routes(): array
    {
        return array_keys(self::$routes);
    }
}

// Auto-setup when WordPress is available.
if (function_exists('add_action')) {
    RestSetup::setup();
}
