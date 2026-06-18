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

      <span class="wpdev-my-1 wpdev-inline-block wpdev-text-xs"><?php echo $field->desc; ?></span>

    <?php endif; ?>

  </div>

  <div class="wpdev-block wpdev-ml-2">

    <div class="wpdev-toggle">

      <input class="wpdev-tgl wpdev-tgl-ios" value="1" <?php checked($field->value == 1); ?>  id="wpdev-tg-<?php echo esc_attr($field->id); ?>" type="checkbox" name="<?php echo esc_attr($field_slug); ?>" <?php echo $field->get_html_attributes(); ?> />

      <label class="wpdev-tgl-btn wp-ui-highlight wpdev-bg-blue-500" for="wpdev-tg-<?php echo esc_attr($field->id); ?>"></label>

    </div>

  </div>

</li>
