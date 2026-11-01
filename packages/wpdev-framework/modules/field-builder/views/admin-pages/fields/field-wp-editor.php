<?php
/**
 * WP editor field view (admin-pages context).
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since 2.0.0
 */

defined('ABSPATH') || exit;

$raw_id        = (string) $field->id;
$clean_id      = sanitize_key(str_replace(['[', ']', '-', '.', ' '], '_', $raw_id));
$unique_suffix = wp_generate_password(6, false, false);
$editor_id     = 'wpdev_editor_' . ($clean_id ?: 'editor') . '_' . $unique_suffix;
$field_name    = $raw_id;
$editor_val    = $field->value !== null ? (string) $field->value : '';
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?> wpdev-w-full wpdev-field-wp-editor-wrapper" <?php echo $field->get_wrapper_html_attributes(); ?>>

	<div class="wpdev-block wpdev-full">

		<label for="<?php echo esc_attr($editor_id); ?>" class="wpdev-font-bold wpdev-block wpdev-mar-b-1">
			<?php
			wpdev_get_template('admin-pages/fields/partials/field-title', array(
				'field' => $field,
			));
			?>
		</label>

		<div class="wpdev-mar-y-2 wpdev-full wpdev-editor-wrap-container">
			<?php
			if (function_exists('wp_editor')) {
				if (function_exists('wp_enqueue_media')) {
					wp_enqueue_media();
				}

				$settings = is_array($field->args) ? $field->args : array();
				foreach (array('teeny', 'media_buttons', 'quicktags', 'textarea_rows', 'tinymce') as $opt) {
					if (!isset($settings[$opt])) {
						$opt_val = isset($field->$opt) ? $field->$opt : (isset($field->atts[$opt]) ? $field->atts[$opt] : null);
						if ($opt_val !== null) {
							$settings[$opt] = $opt_val;
						}
					}
				}
				$settings['textarea_name'] = $field_name;
				$settings['textarea_rows'] = isset($settings['textarea_rows']) ? (int) $settings['textarea_rows'] : 8;
				$settings['media_buttons'] = isset($settings['media_buttons']) ? (bool) $settings['media_buttons'] : true;
				$settings['tinymce']       = isset($settings['tinymce']) ? $settings['tinymce'] : true;
				$settings['quicktags']     = isset($settings['quicktags']) ? $settings['quicktags'] : true;
				if (isset($settings['teeny'])) {
					$settings['teeny'] = (bool) $settings['teeny'];
				}

				/**
				 * Filters settings passed to wp_editor in WPDev admin-pages context.
				 *
				 * @since 2.13.6
				 *
				 * @param array  $settings  Array of editor settings.
				 * @param object $field     WPDev Field object.
				 * @param string $editor_id Unique editor HTML ID.
				 */
				$settings = (array) apply_filters('wpdev_field_wp_editor_settings', $settings, $field, $editor_id);

				if (isset($settings['media_buttons'])) {
					$settings['media_buttons'] = (bool) apply_filters('wpdev_editor_media_buttons', $settings['media_buttons'], $field, $editor_id);
				}

				ob_start();
				wp_editor($editor_val, $editor_id, $settings);
				$editor_html = (string) ob_get_clean();

				// Strip inline <style> tags (e.g. injected by Gravity Forms into media_buttons) that break Vue template compilation.
				$editor_html = (string) preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $editor_html);

				echo $editor_html;
			} else {
				?>
				<textarea name="<?php echo esc_attr($field_name); ?>" id="<?php echo esc_attr($editor_id); ?>" class="form-control wpdev-full" rows="8"><?php echo esc_textarea($editor_val); ?></textarea>
				<?php
			}
			?>
		</div>

		<div>
			<?php
			wpdev_get_template('admin-pages/fields/partials/field-description', array(
				'field' => $field,
			));
			?>
		</div>

	</div>

</li>
