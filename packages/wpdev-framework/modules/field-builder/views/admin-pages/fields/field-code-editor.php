<?php
/**
 * Code editor field view.
 *
 * @since 2.0.0
 */
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block wpdev-w-full">

    <?php

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-title', array(
      'field' => $field,
    ));

    ?>

    <textarea id="field-<?php echo esc_attr($field->id); ?>" data-init="0"  data-code-editor="<?php echo esc_attr($field->lang); ?>" class="form-control wpdev-w-full wpdev-my-1 <?php echo esc_attr($field->classes); ?>" name="<?php echo esc_attr($field->id); ?>" placeholder="<?php echo esc_attr($field->placeholder); ?>" <?php echo $field->get_html_attributes(); ?>><?php echo esc_attr($field->value); ?></textarea>

    <?php

    /**
     * Adds the partial title template.
     * @since 2.0.0
     */
    wpdev_get_template('admin-pages/fields/partials/field-description', array(
      'field' => $field,
    ));

    ?>

  </div>

</li>
