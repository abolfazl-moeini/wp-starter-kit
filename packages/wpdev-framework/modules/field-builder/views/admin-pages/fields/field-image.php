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
  : "wpdev-ml-0 {$mq}md:wpdev-ml-4 {$mq}md:wpdev-w-4/12 wpdev-mt-4 {$mq}md:wpdev-mt-0 lg:wpdev-mt-2";

?>

<li class="<?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="<?php echo $mq; ?>md:wpdev-flex wpdev-items-center wpdev-w-full">

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

      <div class="wpdev-wrapper-image-field wpdev-w-full wpdev-overflow-hidden">

        <div class="wpdev-relative wpdev-w-full wpdev-overflow-hidden">

          <div class="wpdev-self-center wpdev-rounded wpdev-flex <?php echo $mq; ?>md:wpdev-max-w-full wpdev-min-w-full <?php echo $mq; ?>md:wpdev-max-h-20 wpdev-overflow-hidden">

            <img
              class="<?php echo $field->img ? '' : 'wpdev-absolute'; ?> wpdev-self-center wpdev-rounded sm:wpdev-max-w-full wpdev-min-w-full"
              src="<?php echo $field->img; ?>"
            >

          </div>

          <div class="wpdev-wrapper-image-field-upload-actions wpdev-absolute wpdev-top-4 wpdev-right-4 <?php echo $mq; ?>md:wpdev-top-2 <?php echo $mq; ?>md:wpdev-right-2 wpdev-scale-150 <?php echo $mq; ?>md:wpdev-scale-100">

            <a title="<?php _e('Preview Image', 'wpdev'); ?>" href="<?php echo $field->img; ?>" class="wubox wpdev-no-underline wpdev-text-center wpdev-inline-block wpdev-bg-black wpdev-opacity-60 wpdev-rounded-full wpdev-text-white wpdev-w-5 wpdev-h-5 wpdev-shadow-sm">

              <span class="dashicons-wpdev-eye1 wpdev-align-middle" style="top: -2px;"></span>

            </a>

            <a title="<?php _e('Remove Image', 'wpdev'); ?>" href="#" class="wpdev-remove-image wpdev-no-underline wpdev-text-center wpdev-inline-block wpdev-bg-black wpdev-opacity-60 wpdev-rounded-full wpdev-text-white wpdev-w-5 wpdev-h-5 wpdev-shadow-sm">

              <span class="dashicons-wpdev-cross wpdev-align-middle"></span>

            </a>

          </div>

        </div>

        <input name="<?php echo esc_attr($field_slug); ?>" type="hidden" value="<?php echo esc_attr($field->value); ?>" <?php echo $field->get_html_attributes(); ?> />

        <div class="wpdev-add-image-wrapper <?php echo $mq; ?>md:wpdev-mt-0 wpdev-w-full" style="display: none;">

          <a class="button wpdev-w-full wpdev-text-center wpdev-add-image">

            <span class="dashicons-wpdev-upload"></span> <?php _e('Upload Image', 'wpdev'); ?>

          </a>

        </div>

      </div>

    </div>

  </div>

</li>
