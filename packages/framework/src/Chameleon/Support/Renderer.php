<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Support;

use InvalidArgumentException;
use WPDev\Chameleon\Assets\AssetPipeline;

/**
 * Renderer: Safe template partial renderer, root scope wrapper, and escaping helpers (SPEC §3.7 & Plan CP-3).
 * Provides extract-free scoped includes, strictly escaped root elements, and safe HTML sanitization seams.
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
     * Wraps plugin output in the Polaris scope root (.ps-root[data-archetype]).
     *
     * Architecture Invariant (R8):
     * - Does NOT impose layout constraints (ps-container is omitted to avoid forced max-width/gutters).
     * - Security: $inner_html is treated as ALREADY-ESCAPED HTML (caller responsibility).
     * - Fallback: Notifies AssetPipeline::mark_needed() that assets are required for this response.
     * - Nested Roots: If $attrs['inherit_archetype'] is true, data-archetype is omitted to inherit from parent.
     *
     * @param string $inner_html ALREADY-ESCAPED HTML (typically from safe_partial or sanitized output).
     * @param array{class?: string, surface?: string, tag?: string, inherit_archetype?: bool} $attrs
     * @return string
     */
    public static function render_root(string $inner_html, array $attrs = []): string {
        if (class_exists(AssetPipeline::class)) {
            AssetPipeline::mark_needed();
        }

        // The root is a sectioning/grouping wrapper; esc_tag() alone would still accept script/style/iframe.
        $tag = self::esc_tag($attrs['tag'] ?? 'div');
        if (!in_array($tag, ['div', 'section', 'article', 'aside', 'main', 'nav', 'header', 'footer', 'form', 'span'], true)) {
            $tag = 'div';
        }

        $classes = ['ps-root'];
        if (!empty($attrs['class'])) {
            $raw_classes = preg_split('/\s+/', trim((string) $attrs['class']));
            if (is_array($raw_classes)) {
                foreach ($raw_classes as $cls) {
                    $cleaned = function_exists('sanitize_html_class')
                        ? sanitize_html_class($cls)
                        : preg_replace('/[^a-zA-Z0-9_-]/', '', $cls);
                    if (!empty($cleaned)) {
                        $classes[] = $cleaned;
                    }
                }
            }
        }
        $class_attr = implode(' ', array_unique($classes));

        $extra_attrs = [];

        // Omit data-archetype when inherit_archetype is true (nested roots)
        $inherit = !empty($attrs['inherit_archetype']);
        if (!$inherit && class_exists(AssetPipeline::class)) {
            $archetype = AssetPipeline::get_active_archetype();
            $extra_attrs[] = sprintf("data-archetype='%s'", self::esc_html_attr($archetype));
        }

        if (!empty($attrs['surface'])) {
            $extra_attrs[] = sprintf("data-ps-surface='%s'", self::esc_html_attr((string) $attrs['surface']));
        }

        $attrs_str = !empty($extra_attrs) ? ' ' . implode(' ', $extra_attrs) : '';

        return sprintf("<%s class='%s'%s>%s</%s>", $tag, self::esc_html_attr($class_attr), $attrs_str, $inner_html, $tag);
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
