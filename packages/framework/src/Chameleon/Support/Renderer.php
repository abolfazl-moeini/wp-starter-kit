<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Support;

use InvalidArgumentException;

/**
 * Renderer: Safe template partial renderer and escaping helpers (SPEC §3.7).
 * Provides extract-free scoped includes and strict escaping seams.
 */
final class Renderer {
    /**
     * Safely render a PHP partial file with scoped variables without extract().
     *
     * @param string $file Absolute path to partial PHP file
     * @param array<string, mixed> $args Arguments accessible via $args inside partial
     * @return string
     * @throws InvalidArgumentException
     */
    public static function safe_partial(string $file, array $args = []): string {
        if (!file_exists($file) || !is_readable($file)) {
            if (function_exists('_doing_it_wrong')) {
                _doing_it_wrong(__METHOD__, sprintf("Chameleon partial file not found: '%s'", esc_html($file)), '2.0.0');
            }
            return '';
        }

        ob_start();
        (function (string $__file, array $args): void {
            require $__file;
        })($file, $args);

        return (string) ob_get_clean();
    }

    /**
     * Escape an HTML attribute value.
     */
    public static function esc_html_attr(string $value): string {
        return function_exists('esc_attr') ? esc_attr($value) : htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    /**
     * Validate and escape an HTML tag name to prevent tag injection.
     */
    public static function esc_tag(string $tag): string {
        $clean = preg_replace('/[^a-zA-Z0-9_-]/', '', $tag);
        return !empty($clean) ? strtolower($clean) : 'div';
    }
}
