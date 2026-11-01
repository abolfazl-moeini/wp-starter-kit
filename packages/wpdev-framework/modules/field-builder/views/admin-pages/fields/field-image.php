<?php
/**
 * Image field view.
 *
 * @since 2.0.0
 */

/**
 * Set the media query.
 *
 * When the stacked option is present
 * and set to true, ignore the flex arrangement
 * and make elements stacked.
 */
$mq = $field->stacked ? 'ignore-' : '';

$content_wrapper_classes = $field->content_wrapper_classes
  ? esc_attr(trim($field->content_wrapper_classes))
  : "wpdev-mar-l-0 {$mq}md:wpdev-mar-l-4 {$mq}md:wpdev-w-4/12 wpdev-mar-t-4 {$mq}md:wpdev-mar-t-0 lg:wpdev-mar-t-2";

$raw_value = $field->value;
if ( empty( $raw_value ) && function_exists( 'wpdev_get_setting' ) && ! empty( $field->id ) ) {
  $raw_value = wpdev_get_setting( $field->id );
}

$image_url = '';
if ( ! empty( $field->img ) ) {
  $image_url = (string) $field->img;
} elseif ( ! empty( $raw_value ) ) {
  if ( is_numeric( $raw_value ) && (int) $raw_value > 0 ) {
    $src = wp_get_attachment_image_src( (int) $raw_value, 'full' );
    if ( is_array( $src ) && ! empty( $src[0] ) ) {
      $image_url = (string) $src[0];
    } elseif ( function_exists( 'wp_get_attachment_url' ) ) {
      $url = wp_get_attachment_url( (int) $raw_value );
      if ( is_string( $url ) && '' !== $url ) {
        $image_url = $url;
      }
    }
  } elseif ( is_string( $raw_value ) ) {
    $image_url = (string) $raw_value;
  }
} elseif ( ! empty( $field->default ) ) {
  if ( is_numeric( $field->default ) && (int) $field->default > 0 ) {
    $src = wp_get_attachment_image_src( (int) $field->default, 'full' );
    if ( is_array( $src ) && ! empty( $src[0] ) ) {
      $image_url = (string) $src[0];
    } elseif ( function_exists( 'wp_get_attachment_url' ) ) {
      $url = wp_get_attachment_url( (int) $field->default );
      if ( is_string( $url ) && '' !== $url ) {
        $image_url = $url;
      }
    }
  } elseif ( is_string( $field->default ) ) {
    $image_url = (string) $field->default;
  }
}

$width        = ! empty( $field->width ) ? (int) $field->width : 160;
$max_height   = ! empty( $field->height ) ? (int) $field->height : 100;
$button_label = ! empty( $field->button ) ? $field->button : __( 'Upload Image', 'wpdev' );
$change_label = ! empty( $field->change_button ) ? $field->change_button : __( 'Change Image', 'wpdev' );

?>

<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="<?php echo $mq; ?>md:wpdev-inline wpdev-full">

      <div class="<?php echo $mq; ?>md:wpdev-w-10/12">

      <?php

      /**
       * Adds the partial title template.
       * @since 2.0.0
       */
      wpdev_get_template('admin-pages/fields/partials/field-title', array(
        'field' => $field,
      ));

      ?>

      <div class="<?php echo $mq; ?>md:wpdev-w-9/12">

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

    </div>

    <div class="<?php echo $content_wrapper_classes; ?>">

      <div class="wpdev-wrapper-image-field wpdev-full wpdev-overflow-hidden" style="max-width: <?php echo esc_attr( (string) $width ); ?>px;">

        <div class="wpdev-image-preview-wrap wpdev-relative wpdev-full wpdev-overflow-hidden" style="<?php echo $image_url ? '' : 'display: none;'; ?>">

          <div class="wpdev-self-center wpdev-radius wpdev-row wpdev-overflow-hidden" style="max-width: <?php echo esc_attr( (string) $width ); ?>px; max-height: <?php echo esc_attr( (string) $max_height ); ?>px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; display: flex; align-items: center; justify-content: center; min-height: 48px;">

            <img
              class="<?php echo $image_url ? '' : 'wpdev-absolute'; ?> wpdev-self-center wpdev-radius"
              src="<?php echo esc_url($image_url); ?>"
              alt=""
              style="max-width: 100%; max-height: <?php echo esc_attr( (string) $max_height ); ?>px; width: auto; height: auto; object-fit: contain; display: block;"
            >

          </div>

          <div class="wpdev-wrapper-image-field-upload-actions wpdev-absolute wpdev-top-2 wpdev-right-2" style="<?php echo $image_url ? '' : 'display: none;'; ?>">

            <a title="<?php esc_attr_e('Preview Image', 'wpdev'); ?>" href="<?php echo esc_url($image_url); ?>" class="wubox wpdev-no-underline wpdev-type-center wpdev-inline-block wpdev-surface-black wpdev-opacity-60 wpdev-radius-full wpdev-type-white wpdev-w-5 wpdev-h-5 wpdev-shadow-sm">

              <span class="dashicons-wpdev-eye1 wpdev-align-middle" style="top: -2px;"></span>

            </a>

            <a title="<?php esc_attr_e('Remove Image', 'wpdev'); ?>" href="#" class="wpdev-remove-image wpdev-no-underline wpdev-type-center wpdev-inline-block wpdev-surface-black wpdev-opacity-60 wpdev-radius-full wpdev-type-white wpdev-w-5 wpdev-h-5 wpdev-shadow-sm">

              <span class="dashicons-wpdev-cross wpdev-align-middle"></span>

            </a>

          </div>

        </div>

        <input name="<?php echo esc_attr($field->id); ?>" type="hidden" value="<?php echo esc_attr((string) $raw_value); ?>" <?php echo $field->get_html_attributes(); ?> />

        <div class="wpdev-add-image-wrapper wpdev-mar-t-2 wpdev-full" style="<?php echo $image_url ? 'display: none;' : ''; ?>">

          <a class="button wpdev-full wpdev-type-center wpdev-add-image">

            <span class="dashicons-wpdev-upload"></span> <?php echo esc_html( $button_label ); ?>

          </a>

        </div>

        <div class="wpdev-change-image-wrapper wpdev-mar-t-2 wpdev-full" style="<?php echo $image_url ? '' : 'display: none;'; ?>">

          <a class="button button-secondary wpdev-full wpdev-type-center wpdev-change-image">

            <span class="dashicons-wpdev-upload"></span> <?php echo esc_html( $change_label ); ?>

          </a>

        </div>

      </div>

    </div>

  </div>

</li>
