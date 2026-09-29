<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Views;

/**
 * Popover View: Native HTML5 popover="auto" with CSS anchor positioning (SPEC §6).
 */
final class Popover {
    /**
     * Render a native popover element.
     *
     * @param array{
     *   id: string,
     *   content: string,
     *   class?: string
     * } $args
     */
    public static function render(array $args): void {
        $id = esc_attr($args['id']);
        $content = $args['content'] ?? '';
        $extra_class = esc_attr($args['class'] ?? '');

        echo "<div id='{$id}' popover='auto' class='ps-popover ps-card {$extra_class}'>\n";
        echo "  {$content}\n";
        echo "</div>\n";
    }
}
