<?php
/**
 * Submit field view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-mar-y-6 <?php echo esc_attr( trim( $field->wrapper_classes ) ); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-row">

    <div class="wpdev-w-1/3"></div>

    <div class="wpdev-w-2/3">

      <button
        id="<?php echo esc_attr( $field->id ); ?>"
        type="submit"
        name="submit_button"
        value="<?php echo esc_attr( $field->id ); ?>"
        <?php echo $field->get_html_attributes(); ?>
        class="<?php echo esc_attr( trim( $field->classes ) ); ?>"
      >

        <?php echo esc_html( $field->title ); ?>

      </button>

    </div>

  </div>

</div>
