<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Composition;

use Throwable;
use WPDev\Chameleon\Contracts\DashboardContextV1;

/**
 * FailSoftBoundary: Exception and error sandbox for client section and slot renderers.
 * Guarantees that third-party callback errors fail soft without crashing the host page (SPEC §3.7).
 */
final class FailSoftBoundary {
    /**
     * Safely execute a renderer callback.
     *
     * @param callable $renderer
     * @param DashboardContextV1 $context
     * @param string $component_id Identifier for logging
     * @return void
     */
    public static function execute(callable $renderer, DashboardContextV1 $context, string $component_id): void {
        try {
            $renderer($context);
        } catch (Throwable $e) {
            self::handle_error($e, $component_id);
        }
    }

    /**
     * Handle the caught throwable safely.
     */
    private static function handle_error(Throwable $e, string $component_id): void {
        $message = sprintf('Chameleon Renderer Error in [%s]: %s', $component_id, $e->getMessage());

        if (function_exists('_doing_it_wrong')) {
            _doing_it_wrong(__METHOD__, esc_html($message), '2.0.0');
        } else {
            error_log($message);
        }

        $is_debug = (defined('WP_DEBUG') && WP_DEBUG) ||
                    (defined('WP_ENVIRONMENT_TYPE') && WP_ENVIRONMENT_TYPE !== 'production');

        if ($is_debug) {
            echo sprintf(
                "<!-- chameleon: render error in component '%s': %s -->\n",
                esc_html($component_id),
                esc_html($e->getMessage())
            );
            echo sprintf(
                "<div class='ps-card ps-card-error' style='border: 1px dashed red; padding: 0.5rem;'>%s: %s</div>",
                esc_html__('Failed to render component', 'wpdev-chameleon'),
                esc_html($component_id)
            );
        }
    }
}
