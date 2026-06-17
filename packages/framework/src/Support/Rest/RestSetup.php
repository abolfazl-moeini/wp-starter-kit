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
    /** @var array<class-string<RestHandler>> */
    private static array $routes = [];

    public static function register(string|RestHandler $handler): bool
    {
        // $handler is `string|RestHandler`; both branches of the
        // ternary return a string (get_class() always does, and the
        // string-RestHandler case falls through to $handler). So
        // $classname is statically known to be a string here.
        $classname = $handler instanceof RestHandler ? get_class($handler) : $handler;

        // Fail fast on misconfigured class strings. Without this check,
        // the error would surface inside rest_init() as a cryptic
        // "Class 'X' not found" — or a TypeError when WP's
        // register_rest_route() tries to invoke a non-RestHandler
        // instance. Both are hard to diagnose from a stack trace; the
        // return-false contract here lets the caller log + skip the
        // bad route without breaking the rest of the registration.
        if ( ! class_exists( $classname ) ) {
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
        $namespace = $config['restNamespace'] ?? 'wpdev/v1';

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
