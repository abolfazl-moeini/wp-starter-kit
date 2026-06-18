<?php
/**
 * Small header field view.
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

</li>
