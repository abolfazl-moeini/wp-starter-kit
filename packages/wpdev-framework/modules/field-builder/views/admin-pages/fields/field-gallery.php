<?php
/**
 * Gallery / Multi-Image field view for WPDev Field Builder.
 *
 * @package WPDev
 * @subpackage UI
 * @since 2.1.0
 */

defined('ABSPATH') || exit;

if (function_exists('wp_enqueue_media')) {
    wp_enqueue_media();
}

$field_id  = esc_attr($field->id);
$raw_value = $field->value;
$images    = [];

if (empty($raw_value) && function_exists('wpdev_get_setting') && ! empty($field->id)) {
    $raw_value = wpdev_get_setting($field->id);
}

// Normalize values into array of items with thumbnail URL and ID
if (! empty($raw_value)) {
    $raw_items = is_array($raw_value) ? $raw_value : explode(',', (string) $raw_value);
    foreach ($raw_items as $item) {
        if (is_array($item)) {
            $item = $item['image_url'] ?? ($item['id'] ?? ($item['url'] ?? ''));
        }
        $item = trim((string) $item);
        if ('' === $item) {
            continue;
        }
        if (is_numeric($item) && (int) $item > 0) {
            $att_id = (int) $item;
            $src    = wp_get_attachment_image_src($att_id, 'thumbnail');
            $full   = wp_get_attachment_image_src($att_id, 'full');
            $images[] = [
                'id'        => $att_id,
                'thumb_url' => $src ? $src[0] : (function_exists('wp_get_attachment_url') ? (string) wp_get_attachment_url($att_id) : ''),
                'full_url'  => $full ? $full[0] : (function_exists('wp_get_attachment_url') ? (string) wp_get_attachment_url($att_id) : ''),
            ];
        } elseif (filter_var($item, FILTER_VALIDATE_URL)) {
            $images[] = [
                'id'        => $item,
                'thumb_url' => $item,
                'full_url'  => $item,
            ];
        }
    }
}

$button_label = ! empty($field->button) ? (string) $field->button : __('افزودن تصاویر به گالری', 'wpdev');
$columns      = ! empty($field->columns) ? (int) $field->columns : 5;
$has_images   = ! empty($images);
?>

<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>
    <div class="wpdev-full">
        <!-- Title & Description Partials -->
        <?php wpdev_get_template('admin-pages/fields/partials/field-title', ['field' => $field]); ?>
        <?php wpdev_get_template('admin-pages/fields/partials/field-description', ['field' => $field]); ?>

        <div class="wpdev-gallery-field-container wpdev-full wpdev-mar-t-3" data-field-id="<?php echo $field_id; ?>" data-columns="<?php echo $columns; ?>">
            <!-- P1 REMEDIATION: Form Submission Anchor (Ensures clearing to 0 images saves properly) -->
            <input type="hidden" name="<?php echo $field_id; ?>__present" value="1" />

            <!-- P2 REMEDIATION: Family 5 Empty State Card -->
            <div class="wpdev-gallery-empty-state wpdev-block wpdev-full wpdev-pad-6 wpdev-type-center wpdev-surface-gray-50 wpdev-border-dashed wpdev-border-gray-300 wpdev-radius wpdev-mar-b-3" style="<?php echo $has_images ? 'display: none;' : ''; ?>">
                <span class="dashicons dashicons-format-gallery wpdev-type-gray-400" style="font-size:32px;width:32px;height:32px;margin:0 auto 8px auto;display:block;" aria-hidden="true"></span>
                <p class="wpdev-type-sm wpdev-font-medium wpdev-type-gray-600 wpdev-mar-b-3">
                    <?php echo esc_html(__('هنوز هیچ تصویری برای این گالری انتخاب نشده است.', 'wpdev')); ?>
                </p>
                <button type="button" class="button button-primary wpdev-add-gallery-images-btn">
                    <span class="dashicons dashicons-plus-alt2 wpdev-align-middle" aria-hidden="true"></span>
                    <?php echo esc_html($button_label); ?>
                </button>
            </div>

            <!-- Grid of Image Thumbnails -->
            <ul class="wpdev-gallery-grid wpdev-row wpdev-flex-wrap wpdev-gap-3" id="wpdev-gallery-<?php echo $field_id; ?>-list" style="<?php echo $has_images ? '' : 'display: none;'; ?>">
                <?php foreach ($images as $img): ?>
                    <li class="wpdev-gallery-item wpdev-relative wpdev-radius wpdev-overflow-hidden wpdev-surface-white wpdev-border wpdev-border-gray-300 wpdev-shadow-xs" data-id="<?php echo esc_attr((string) $img['id']); ?>">
                        <!-- Image thumbnail with object-fit -->
                        <img src="<?php echo esc_url($img['thumb_url']); ?>" alt="" class="wpdev-gallery-thumb" loading="lazy" />

                        <!-- Persisted item input -->
                        <input type="hidden" name="<?php echo $field_id; ?>[]" value="<?php echo esc_attr((string) $img['id']); ?>" />

                        <!-- Action controls overlay -->
                        <div class="wpdev-gallery-item-actions wpdev-absolute wpdev-top-1" style="inset-inline-end: 0.25rem;">
                            <!-- Lightbox preview -->
                            <a href="<?php echo esc_url($img['full_url']); ?>" class="wubox wpdev-gallery-action-btn" title="<?php echo esc_attr(__('پیش‌نمایش تصویر', 'wpdev')); ?>" aria-label="<?php echo esc_attr(__('پیش‌نمایش تصویر', 'wpdev')); ?>">
                                <span class="dashicons dashicons-visibility wpdev-align-middle" aria-hidden="true"></span>
                            </a>
                            <!-- Delete button -->
                            <button type="button" class="wpdev-gallery-item-remove wpdev-gallery-action-btn" title="<?php echo esc_attr(__('حذف تصویر از گالری', 'wpdev')); ?>" aria-label="<?php echo esc_attr(__('حذف تصویر از گالری', 'wpdev')); ?>">
                                <span class="dashicons dashicons-no-alt wpdev-align-middle" aria-hidden="true"></span>
                            </button>
                        </div>

                        <!-- Drag handle indicator -->
                        <span class="wpdev-gallery-item-sort-handle wpdev-absolute wpdev-bottom-1" style="inset-inline-start: 0.25rem;" title="<?php echo esc_attr(__('برای تغییر ترتیب بکشید', 'wpdev')); ?>" aria-label="<?php echo esc_attr(__('برای تغییر ترتیب بکشید', 'wpdev')); ?>">
                            <span class="dashicons dashicons-menu wpdev-align-middle" aria-hidden="true"></span>
                        </span>
                    </li>
                <?php endforeach; ?>
            </ul>

            <!-- Bottom Add Button (visible when grid has items) -->
            <div class="wpdev-gallery-toolbar wpdev-mar-t-3" style="<?php echo $has_images ? '' : 'display: none;'; ?>">
                <button type="button" class="button button-secondary wpdev-add-gallery-images-btn">
                    <span class="dashicons dashicons-format-gallery wpdev-align-middle" aria-hidden="true"></span>
                    <?php echo esc_html(__('افزودن تصاویر بیشتر', 'wpdev')); ?>
                </button>
            </div>
        </div>
    </div>
</li>
