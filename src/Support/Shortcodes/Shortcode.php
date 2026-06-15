<?php
declare(strict_types=1);

namespace WPSK\Support\Shortcodes;

/**
 * Base for class-based shortcode handlers.
 * Reimplemented (new code) per plan.v2.md.
 */
abstract class Shortcode
{
    abstract public function render_shortcode(array $attributes, string $content, string $tag): string;
}
