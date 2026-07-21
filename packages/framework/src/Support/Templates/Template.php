<?php
declare(strict_types=1);

namespace WPDev\Support\Templates;

/**
 * Lightweight template variable store + file loader.
 *
 * Ported from betterstudio/core-essentials template helpers:
 * set/get template variables, load a PHP partial, render messages.
 *
 * Prefer this over scattering include/extract() so templates read named
 * vars via get_template_variable() / Template::get_variable().
 *
 * Global bag: $wpdev_template_vars (isolated from theme/plugin globals).
 *
 * @see functions.php Namespaced function aliases for use inside partials.
 */
final class Template
{
    /**
     * Load a PHP template from $directory / $template.
     *
     * The partial can call get_template_variable() / Template::get_variable().
     * Returns false when the file is missing or unreadable.
     */
    public static function load(string $template, string $directory): bool
    {
        $path = self::resolve_path($directory, $template);

        if ($path === '' || !is_readable($path)) {
            return false;
        }

        include $path;

        return true;
    }

    /**
     * Capture template output as a string (load + output buffering).
     */
    public static function render(string $template, string $directory): string
    {
        ob_start();
        self::load($template, $directory);

        return (string) ob_get_clean();
    }

    /**
     * @param mixed $value
     */
    public static function set_variable(string $name, $value): void
    {
        $vars = &self::bag();
        $vars[$name] = $value;
    }

    /**
     * @return mixed|null
     */
    public static function get_variable(string $name)
    {
        $vars = self::bag();

        return $vars[$name] ?? null;
    }

    /**
     * Replace the entire variable bag (by reference, same as core-essentials).
     *
     * @param array<string, mixed> $vars
     */
    public static function set_variables(array &$vars): void
    {
        $GLOBALS['wpdev_template_vars'] = &$vars;
    }

    /**
     * @return array<string, mixed>
     */
    public static function get_variables(): array
    {
        return self::bag();
    }

    /**
     * Normalize WP_Error / Exception / array / string into HTML via views/messages.php.
     *
     * @param mixed $the_error
     */
    public static function render_messages($the_error): string
    {
        $errors = self::normalize_messages($the_error);
        self::set_variable('messages', $errors);

        return self::render('messages.php', __DIR__ . '/views');
    }

    /**
     * @internal Test isolation only.
     */
    public static function reset_for_tests(): void
    {
        $GLOBALS['wpdev_template_vars'] = [];
    }

    /**
     * @return array<string, mixed>
     */
    private static function &bag(): array
    {
        if (!isset($GLOBALS['wpdev_template_vars']) || !is_array($GLOBALS['wpdev_template_vars'])) {
            $GLOBALS['wpdev_template_vars'] = [];
        }

        return $GLOBALS['wpdev_template_vars'];
    }

    private static function resolve_path(string $directory, string $template): string
    {
        if (function_exists('trailingslashit')) {
            return trailingslashit($directory) . $template;
        }

        return rtrim($directory, "/\\") . '/' . ltrim($template, "/\\");
    }

    /**
     * @param mixed $the_error
     * @return list<array{code: mixed, message: mixed, type: mixed}>
     */
    private static function normalize_messages($the_error): array
    {
        if (function_exists('is_wp_error') && is_wp_error($the_error)) {
            /** @var \WP_Error $the_error */
            $errors = [];
            foreach ($the_error->get_error_codes() as $code) {
                foreach ($the_error->get_error_messages($code) as $message) {
                    $type = $the_error->get_error_data($code);
                    $errors[] = compact('code', 'message', 'type');
                }
            }

            return $errors;
        }

        if ($the_error instanceof \Exception) {
            $type = 'error';
            if (is_callable([$the_error, 'getType'])) {
                /** @var callable $getter */
                $getter = [$the_error, 'getType'];
                $type = $getter();
            }

            return [
                [
                    'code'    => $the_error->getCode(),
                    'message' => $the_error->getMessage(),
                    'type'    => $type,
                ],
            ];
        }

        if (is_array($the_error)) {
            if (!isset($the_error[0])) {
                $the_error = [$the_error];
            }

            return $the_error;
        }

        if (is_string($the_error)) {
            return [
                [
                    'code'    => 'warning',
                    'message' => $the_error,
                    'type'    => 'warning',
                ],
            ];
        }

        return [];
    }
}
