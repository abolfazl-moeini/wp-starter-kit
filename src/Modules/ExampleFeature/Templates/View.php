<?php
declare(strict_types=1);

namespace WPDev\Modules\ExampleFeature\Templates;

use WPDev\Support\Templates\Template;

/**
 * ExampleFeature template helpers — canonical Template API usage.
 *
 * Patterns (from core-essentials functions.php):
 * - set_variable / get_variable — pass data into PHP partials
 * - load / render — include a partial from this module's Templates/
 * - render_messages — WP_Error / Exception / string → HTML list
 *
 * @see \WPDev\Support\Templates\Template
 * @see \WPDev\Support\Templates\set_template_variable()
 */
final class View
{
    /**
     * Absolute path to this module's Templates directory.
     */
    public static function directory(): string
    {
        return __DIR__;
    }

    /**
     * Render a partial from Templates/ (captures output).
     */
    public static function render(string $template): string
    {
        return Template::render($template, self::directory());
    }

    /**
     * Load a partial without capturing (echoes).
     */
    public static function load(string $template): bool
    {
        return Template::load($template, self::directory());
    }

    /**
     * Demo: set template vars then render status-notice.php.
     */
    public static function notice(string $message, string $type = 'info'): string
    {
        Template::set_variable('notice', [
            'message' => $message,
            'type'    => $type,
        ]);

        return self::render('status-notice.php');
    }

    /**
     * Demo: framework messages partial for errors/warnings.
     *
     * @param mixed $error WP_Error|Exception|array|string
     */
    public static function messages($error): string
    {
        return Template::render_messages($error);
    }
}
