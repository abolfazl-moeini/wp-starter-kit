<?php
/**
 * Hidden field view.
 *
 * @since 2.0.0
 */
?>
<li class="wpdev-hidden wpdev-m-0">

  <input class="form-control wpdev-w-full" name="<?php echo esc_attr($field->id); ?>" type="<?php echo esc_attr($field->type); ?>" placeholder="<?php echo esc_attr($field->placeholder); ?>" value="<?php echo esc_attr($field->value); ?>" <?php echo $field->get_html_attributes(); ?>>

</li>
