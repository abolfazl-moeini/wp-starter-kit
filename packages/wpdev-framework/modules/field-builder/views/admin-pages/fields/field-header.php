<?php
/**
 * Header field view.
 *
 * @since 2.0.0
 */
?>
<li class="wpdev-surface-gray-100 wpdev-pad-y-4 <?php echo esc_attr(trim($field->wrapper_classes)); ?>" <?php echo $field->get_wrapper_html_attributes(); ?>>

  <div class="wpdev-block wpdev-full">

    <h3 class="wpdev-mar-y-1 wpdev-type-base wpdev-type-gray-800">

      <?php echo $field->title; ?>

      <?php if ($field->tooltip) : ?>

        <?php echo wpdev_tooltip($field->tooltip); ?>

      <?php endif; ?>

    </h3>

    <?php if ($field->desc) : ?>

    <p class="wpdev-mar-t-1 wpdev-mar-b-0 wpdev-type-gray-700">

      <?php echo $field->desc; ?>

    </p>

    <?php endif; ?>

  </div>

</li>
