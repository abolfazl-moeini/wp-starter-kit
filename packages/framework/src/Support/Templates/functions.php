<?php
declare(strict_types=1);

/**
 * Namespaced template helpers (core-essentials API shape).
 *
 * Loaded via Composer "files" autoload. Prefer these inside PHP partials:
 *
 *   use function WPDev\Support\Templates\get_template_variable;
 *   $title = get_template_variable('title');
 *
 * Class API: WPDev\Support\Templates\Template
 */

namespace WPDev\Support\Templates;

// Guard against double-load (path package + local symlink both in autoload).
if (!function_exists(__NAMESPACE__ . '\\set_template_variable')) {
    /**
     * @param mixed $value
     */
    function set_template_variable(string $name, $value): void
    {
        Template::set_variable($name, $value);
    }

    /**
     * @return mixed|null
     */
    function get_template_variable(string $name)
    {
        return Template::get_variable($name);
    }

    /**
     * @param array<string, mixed> $vars
     */
    function set_template_variables(array &$vars): void
    {
        Template::set_variables($vars);
    }

    /**
     * @return array<string, mixed>
     */
    function get_template_variables(): array
    {
        return Template::get_variables();
    }

    /**
     * @param string $template Relative file name (e.g. "notice.php").
     * @param string $directory Absolute directory containing the template.
     */
    function load_template($template, $directory): bool
    {
        return Template::load((string) $template, (string) $directory);
    }

    /**
     * @param mixed $the_error WP_Error|Exception|array|string
     */
    function render_messages($the_error): string
    {
        return Template::render_messages($the_error);
    }
}
