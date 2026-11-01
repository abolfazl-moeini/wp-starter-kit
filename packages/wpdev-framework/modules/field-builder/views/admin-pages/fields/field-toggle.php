<?php
/**
 * Toggle field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block">

    <?php

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-title', array(
      'field' => $field,
    ));

    ?>

    <?php if ($field->desc) : ?>

      <span class="wpdev-mar-y-1 wpdev-inline-block wpdev-type-xs"><?php echo $field->desc; ?></span>

    <?php endif; ?>

  </div>

  <div class="wpdev-block wpdev-mar-l-2" dir="ltr">

    <div class="wpdev-toggle" dir="ltr">

      <?php
      // Unique per render so repeater rows (and clones) do not share label[for]/id.
      $toggle_uid = 'wpdev-tg-' . preg_replace('/[^A-Za-z0-9_-]/', '-', (string) $field->id) . '-' . uniqid('', false);

      $raw_html_attr = is_array($field->html_attr) ? $field->html_attr : array();
      $dyn_name      = $raw_html_attr['v-bind:name'] ?? ($raw_html_attr[':name'] ?? null);
      $has_dyn_id    = isset($raw_html_attr['v-bind:id']) || isset($raw_html_attr[':id']);
      $dyn_id_attr   = '';
      $dyn_for_attr  = '';

      if ($dyn_name) {
        if (!$has_dyn_id) {
          $dyn_id_expr  = "'" . esc_js($toggle_uid) . "-' + (" . $dyn_name . ")";
          $dyn_id_attr  = ' :id="' . esc_attr($dyn_id_expr) . '"';
          $dyn_for_attr = ' :for="' . esc_attr($dyn_id_expr) . '"';
        }
      }
      ?>

      <input type="hidden" name="<?php echo esc_attr($field->id); ?>" <?php if ($dyn_name) : ?>:name="<?php echo esc_attr($dyn_name); ?>" <?php endif; ?>value="0"<?php disabled($field->disabled); ?> />
      <input class="wpdev-tgl wpdev-tgl-ios" value="1" <?php checked($field->value == 1); ?> id="<?php echo esc_attr($toggle_uid); ?>"<?php echo $dyn_id_attr; ?> type="checkbox" name="<?php echo esc_attr($field->id); ?>" <?php echo $field->get_html_attributes(); ?> />

      <label class="wpdev-tgl-btn wp-ui-highlight wpdev-surface-blue-500" for="<?php echo esc_attr($toggle_uid); ?>"<?php echo $dyn_for_attr; ?>></label>

    </div>

  </div>

</li>
