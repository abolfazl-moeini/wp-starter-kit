<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme\HostTokens;

/**
 * Strict allow-list sanitizers for host theme design tokens (R12 / Plan 2).
 */
final class Sanitizer {
    /**
     * Strict allow-list sanitizer for CSS color values.
     * Rejects injection payloads, unbalanced parens, and url() or script contexts.
     *
     * @param string $val Raw color value.
     * @return string|null Sanitized color or null if invalid.
     */
    public static function sanitize_color(string $val): ?string {
        $val = trim($val);
        if (empty($val)) {
            return null;
        }

        // 1. Hex colors: #rgb, #rgba, #rrggbb, #rrggbbaa
        if (preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $val)) {
            return strtolower($val);
        }

        // 2. rgb / rgba
        if (preg_match('/^rgba?\(\s*[\d.]+%?(?:\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*[\d.]+%?)?|\s+[\d.]+%?\s+[\d.]+%?(?:\s*\/\s*[\d.]+%?)?)\s*\)$/i', $val)) {
            return $val;
        }

        // 3. hsl / hsla
        if (preg_match('/^hsla?\(\s*[\d.]+(?:deg|grad|rad|turn)?(?:\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*[\d.]+%?)?|\s+[\d.]+%?\s+[\d.]+%?(?:\s*\/\s*[\d.]+%?)?)\s*\)$/i', $val)) {
            return $val;
        }

        // 4. oklch
        if (preg_match('/^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(?:deg|grad|rad|turn)?\s*(?:\/\s*[\d.]+%?\s*)?\)$/i', $val)) {
            return $val;
        }

        // 5. WordPress theme preset variable
        if (preg_match('/^var\(--wp--preset--color--[a-zA-Z0-9_-]+\)$/', $val)) {
            return $val;
        }

        // 6. Safe named keywords
        if (in_array(strtolower($val), ['transparent', 'currentcolor', 'inherit'], true)) {
            return strtolower($val);
        }

        return null;
    }

    /**
     * Strict allow-list sanitizer for CSS length / dimension values.
     *
     * @param string $val Raw length value.
     * @return string|null Sanitized length or null if invalid.
     */
    public static function sanitize_length(string $val): ?string {
        $val = trim($val);
        if ($val === '') {
            return null;
        }

        // 0, dimensions with standard CSS units
        if (preg_match('/^(?:0|\+?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vh|vw|ch|vmin|vmax))$/i', $val)) {
            return $val;
        }

        // WordPress preset variables for spacing or radius
        if (preg_match('/^var\(--wp--preset--(?:spacing|radius)--[a-zA-Z0-9_-]+\)$/', $val)) {
            return $val;
        }

        return null;
    }

    /**
     * Strict allow-list sanitizer for CSS font families.
     *
     * @param string $val Raw font family string.
     * @return string|null Sanitized font family or null if invalid.
     */
    public static function sanitize_font_family(string $val): ?string {
        $val = trim($val);
        if (empty($val)) {
            return null;
        }

        // Reject dangerous characters immediately
        if (preg_match('/[;<>{}\(\)\\\\]/', $val)) {
            return null;
        }

        // Only allow alphanumeric, spaces, commas, hyphens, and quotes
        if (!preg_match('/^[a-zA-Z0-9_\-\s,\'\"]+$/', $val)) {
            return null;
        }

        // Verify balanced quotes
        $single_quotes = substr_count($val, "'");
        $double_quotes = substr_count($val, '"');
        if (($single_quotes % 2 !== 0) || ($double_quotes % 2 !== 0)) {
            return null;
        }

        return $val;
    }
}
