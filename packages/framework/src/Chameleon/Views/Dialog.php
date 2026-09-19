<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Views;

/**
 * Dialog View: Native HTML5 <dialog> modal with zero framework JavaScript (SPEC §6.1).
 */
final class Dialog {
    /**
     * Render a semantic native dialog modal.
     *
     * @param array{
     *   id: string,
     *   title: string,
     *   content: string,
     *   actions?: string,
     *   class?: string
     * } $args
     */
    public static function render(array $args): void {
        $id = esc_attr($args['id']);
        $title = esc_html($args['title']);
        $content = $args['content'] ?? '';
        $actions = $args['actions'] ?? '';
        $extra_class = esc_attr($args['class'] ?? '');

        echo "<dialog id='{$id}' class='ps-modal {$extra_class}' data-ps-modal>\n";
        echo "  <div class='ps-modal-dialog'>\n";
        echo "    <header class='ps-modal-header ps-cluster' style='justify-content: space-between;'>\n";
        echo "      <h3 class='ps-heading'>{$title}</h3>\n";
        echo "      <button type='button' class='ps-btn ps-btn-close' data-ps-close aria-label='Close'>&times;</button>\n";
        echo "    </header>\n";
        echo "    <div class='ps-modal-body ps-stack'>\n";
        echo "      {$content}\n";
        echo "    </div>\n";
        if (!empty($actions)) {
            echo "    <footer class='ps-modal-footer ps-cluster' style='justify-content: flex-end;'>\n";
            echo "      {$actions}\n";
            echo "    </footer>\n";
        }
        echo "  </div>\n";
        echo "</dialog>\n";
    }
}
