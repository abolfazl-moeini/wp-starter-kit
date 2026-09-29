<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Views;

use WPDev\Chameleon\Generated\ClassNames;

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

        if (class_exists(\WPDev\Chameleon\Assets\AssetPipeline::class)) {
            \WPDev\Chameleon\Assets\AssetPipeline::require_behavior('dialog');
        }

        $close_label = function_exists('esc_attr__') ? esc_attr__('Close', 'wpdev-chameleon') : 'Close';

        $modal_class = esc_attr(ClassNames::MODAL . ($extra_class !== '' ? ' ' . $extra_class : ''));
        $dialog_class = esc_attr(ClassNames::MODAL_DIALOG);
        $header_class = esc_attr(ClassNames::MODAL_HEADER . ' ' . ClassNames::CLUSTER);
        $heading_class = esc_attr(ClassNames::HEADING);
        $btn_class = esc_attr(ClassNames::BUTTON . ' ' . ClassNames::BUTTON_GHOST . ' ' . ClassNames::BUTTON_ICON_ONLY);
        $body_class = esc_attr(ClassNames::MODAL_BODY . ' ' . ClassNames::STACK);
        $footer_class = esc_attr(ClassNames::MODAL_FOOTER . ' ' . ClassNames::CLUSTER);

        echo "<dialog id='{$id}' class='{$modal_class}' aria-labelledby='{$id}-title' data-ps-modal>\n";
        echo "  <div class='{$dialog_class}'>\n";
        echo "    <header class='{$header_class}'>\n";
        echo "      <h3 id='{$id}-title' class='{$heading_class}'>{$title}</h3>\n";
        echo "      <button type='button' class='{$btn_class}' data-ps-close aria-label='{$close_label}'>&times;</button>\n";
        echo "    </header>\n";
        echo "    <div class='{$body_class}'>\n";
        echo "      {$content}\n";
        echo "    </div>\n";
        if (!empty($actions)) {
            echo "    <footer class='{$footer_class}'>\n";
            echo "      {$actions}\n";
            echo "    </footer>\n";
        }
        echo "  </div>\n";
        echo "</dialog>\n";
    }
}
