<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Views;

/**
 * Details View: Native HTML5 <details>/<summary> accordion disclosure with @starting-style transitions (SPEC §6).
 */
final class Details {
    /**
     * Render a native details/summary disclosure item.
     *
     * @param array{
     *   summary: string,
     *   content: string,
     *   open?: bool,
     *   class?: string
     * } $args
     */
    public static function render(array $args): void {
        $summary = esc_html($args['summary']);
        $content = $args['content'] ?? '';
        $open_attr = !empty($args['open']) ? ' open' : '';
        $extra_class = esc_attr($args['class'] ?? '');

        echo "<details class='ps-details ps-card {$extra_class}'{$open_attr}>\n";
        echo "  <summary class='ps-summary ps-cluster' style='cursor: pointer; justify-content: space-between;'>\n";
        echo "    <span class='ps-summary-title'>{$summary}</span>\n";
        echo "  </summary>\n";
        echo "  <div class='ps-details-content ps-stack' style='padding-top: var(--ps-space-3);'>\n";
        echo "    {$content}\n";
        echo "  </div>\n";
        echo "</details>\n";
    }
}
