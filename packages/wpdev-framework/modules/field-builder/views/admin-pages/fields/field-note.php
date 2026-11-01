<?php
/**
 * Note field view.
 *
 * @since 2.0.0
 */
$note_content = ! empty( $field->desc ) ? $field->desc : ( ! empty( $field->content ) ? $field->content : '' );
?>
<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <?php

  /**
   * Adds the partial title template.
   * @since 2.0.0
   */
  wpdev_get_template('admin-pages/fields/partials/field-title', array(
    'field' => $field,
  ));

  ?>

  <div class="<?php echo esc_attr('wpdev-mar-y-0 '.$field->classes); ?>">

    <?php echo $note_content; ?>

  </div>

</li>
