<?php
/**
 * Field wp_editor view (settings context).
 *
 * Renamed from field-wp_editor.php (K1-02): Field::get_template_name() converts
 * underscores to hyphens, so the underscore filename was never matched.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-mar-y-6">

  <div class="wpdev-row">

    <div class="wpdev-w-1/3">

      <label for="<?php echo esc_attr($field->id); ?>">

        <?php echo $field->title; ?>

      </label>

    </div>

    <div class="wpdev-w-2/3">

      <div style="max-width: 800px;">

        <?php
        if (function_exists('wp_enqueue_media')) {
            wp_enqueue_media();
        }

        $settings = is_array($field->args) ? $field->args : array();
        $settings['media_buttons'] = isset($settings['media_buttons']) ? (bool) $settings['media_buttons'] : true;
        $settings['textarea_rows'] = isset($settings['textarea_rows']) ? (int) $settings['textarea_rows'] : 8;
        $settings['tinymce']       = isset($settings['tinymce']) ? $settings['tinymce'] : true;
        $settings['quicktags']     = isset($settings['quicktags']) ? $settings['quicktags'] : true;

        /**
         * Filters settings passed to wp_editor in WPDev settings context.
         *
         * @since 2.13.6
         *
         * @param array  $settings  Array of editor settings.
         * @param object $field     WPDev Field object.
         * @param string $editor_id Setting field ID.
         */
        $settings = (array) apply_filters('wpdev_field_wp_editor_settings', $settings, $field, $field->id);

        if (isset($settings['media_buttons'])) {
            $settings['media_buttons'] = (bool) apply_filters('wpdev_editor_media_buttons', $settings['media_buttons'], $field, $field->id);
        }

        ob_start();
        wp_editor(wpdev_get_setting($field->id), $field->id, $settings);
        $editor_html = (string) ob_get_clean();
        $editor_html = (string) preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $editor_html);
        echo $editor_html;
        ?>

      </div>

      <?php if ($field->desc) : ?>

        <p class="description" id="<?php echo $field->id; ?>-desc">

          <?php echo $field->desc; ?>

        </p>

      <?php endif; ?>

    </div>

  </div>

</div>
